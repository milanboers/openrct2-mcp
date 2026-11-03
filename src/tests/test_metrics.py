"""Real MCP calls produce opt-in metadata without recording tool contents."""

import asyncio
from io import StringIO
import json
from unittest.mock import MagicMock, patch

import pytest
from fastmcp import Client

from openrct2_mcp import mcp_server as server
from openrct2_mcp.api_client import APIError
from openrct2_mcp.metrics import summarize_metrics


@pytest.fixture
def api():
    api = MagicMock()
    api.list_all_rides.return_value = [{'id': 7, 'type': 52}]
    api.get_valid_next_pieces.return_value = {
        'validPieces': [0], 'position': {'x': 66, 'y': 66, 'z': 14, 'direction': 0},
    }
    api.get_coaster_state.return_value = {
        'rideType': 52, 'history': [], 'layoutStatus': 'empty', 'validPieces': [],
    }
    return api


def test_metrics_distinguish_queries_partial_builds_and_removals_without_contents(tmp_path, api, monkeypatch):
    sink = StringIO()
    api.place_path_tile.return_value = {'observed_after': {'paths': []}}
    api.remove_path_tile.return_value = {'observed_after': {'paths': []}}
    api.place_track_piece.side_effect = [
        {'placeable': False, 'error': 9}, {}, APIError('Obstructed'),
    ]

    async def run():
        async with Client(server.mcp) as client:
            query = await client.call_tool('check_track_segment', {'ride_id': 7, 'track_type': 'Flat'})
            assert json.loads(query.content[0].text)['placeable'] is False
            built = await client.call_tool('place_track_sequence', {
                'ride_id': 7, 'segments': [{'track_type': 'Flat'}, {'track_type': 'Flat'}],
                'include_image': False, 'compact': True,
            })
            assert built.structured_content['operation_outcome'] == 'rejected'
            assert built.structured_content['execution_status'] == 'partial'
            removed = await client.call_tool('remove_terminal_piece', {
                'ride_id': 7, 'include_image': False, 'compact': True,
            })
            assert removed.structured_content['operation_outcome'] == 'confirmed'
            await client.call_tool('check_track_segment', {'ride_id': 7, 'track_type': 'private-design-name'})
            await client.call_tool('place_path_tile', {
                'x': 10, 'y': 20, 'z': 14, 'surface_object': 0, 'railings_object': 0,
            })
            await client.call_tool('remove_path_tile', {'x': 10, 'y': 20, 'z': 14, 'expected_path': {}})

    monkeypatch.setattr(server.result_middleware, 'sink', sink)
    with patch.object(server, 'api_client', api):
        asyncio.run(run())
        server.result_middleware.finish_capture()
    path = tmp_path / 'metrics.jsonl'
    path.write_text(sink.getvalue())

    metrics = summarize_metrics(path)

    assert metrics['capture_complete'] is True
    assert metrics['tool_calls'] == 6
    assert metrics['requested_placements'] == 3
    assert metrics['confirmed_placements'] == 2
    assert metrics['rejected_placement_requests'] == 1
    assert metrics['confirmed_removals'] == 2
    assert metrics['query_candidates'] == 2
    assert metrics['blocked_query_candidates'] == 1
    assert metrics['response_text_bytes'] > 0
    assert metrics['response_image_base64_chars'] == 0
    assert metrics['tool_failures'] == 2
    assert len(metrics['sha256']) == 64
    assert 'private-design-name' not in sink.getvalue()
    assert 'arguments' not in sink.getvalue()
    assert 'Obstructed' not in sink.getvalue()


def test_metrics_write_failure_does_not_hide_confirmed_mutation(api, monkeypatch):
    sink = StringIO()
    sink.close()

    async def run():
        async with Client(server.mcp) as client:
            result = await client.call_tool('close_ride', {'ride_id': 7})
            assert result.structured_content['operation_outcome'] == 'confirmed'
            assert not result.is_error

    monkeypatch.setattr(server.result_middleware, 'sink', sink)
    with patch.object(server, 'api_client', api):
        asyncio.run(run())
        assert server.result_middleware.sink is None


def test_validation_error_metrics_do_not_mask_the_original_error(api, monkeypatch):
    sink = StringIO()

    async def run():
        async with Client(server.mcp) as client:
            result = await client.call_tool('place_track_sequence', {'ride_id': 7, 'segments': None}, raise_on_error=False)
            assert result.is_error

    monkeypatch.setattr(server.result_middleware, 'sink', sink)
    with patch.object(server, 'api_client', api):
        asyncio.run(run())

    event = json.loads(sink.getvalue())
    assert event['tool_success'] is False
    assert event['tool_error']
    assert event['requested_placements'] == 0
    assert event['confirmed_placements'] == 0
    api.place_track_piece.assert_not_called()


@pytest.mark.parametrize('contents', ['', '{"schema_version": 2}\n', 'unfinished JSON'])
def test_metrics_require_a_complete_versioned_run(tmp_path, contents):
    path = tmp_path / 'metrics.jsonl'
    path.write_text(contents)

    with pytest.raises(ValueError):
        summarize_metrics(path)


def test_metrics_startup_never_overwrites_an_existing_run(tmp_path):
    path = tmp_path / 'metrics.jsonl'
    path.write_text('previous run')
    with patch('sys.argv', ['openrct2-mcp', '--metrics-file', str(path)]), patch.object(server.mcp, 'run') as run:
        with pytest.raises(SystemExit) as error:
            server.main()

    assert error.value.code == 2
    assert path.read_text() == 'previous run'
    run.assert_not_called()


def test_server_configures_local_port_and_closes_metrics_and_connection(tmp_path, api):
    path = tmp_path / 'metrics.jsonl'
    observed = []

    def serve():
        observed.append(api.port)
        assert server.result_middleware.sink is not None

    with patch('sys.argv', ['openrct2-mcp', '--port', '12345', '--metrics-file', str(path)]), \
         patch.object(server, 'api_client', api), patch.object(server.mcp, 'run', side_effect=serve):
        server.main()

    assert observed == [12345]
    assert json.loads(path.read_text()) == {'schema_version': 1, 'kind': 'capture_end', 'tool_calls': 0}
    assert server.result_middleware.sink is None
    api.close.assert_called_once_with()


def test_failed_capture_leaves_a_prefix_that_requires_explicit_incomplete_consent(tmp_path, api, monkeypatch):
    class FailingAfterFirstWrite(StringIO):
        def write(self, value):
            if self.tell():
                raise OSError('Disk full')
            return super().write(value)

    sink = FailingAfterFirstWrite()
    monkeypatch.setattr(server.result_middleware, 'sink', sink)
    with patch.object(server, 'api_client', api):
        async def run():
            async with Client(server.mcp) as client:
                first = await client.call_tool('close_ride', {'ride_id': 7})
                second = await client.call_tool('close_ride', {'ride_id': 7})
                return first.structured_content, second.structured_content

        first, second = asyncio.run(run())
        server.result_middleware.finish_capture()
    path = tmp_path / 'partial.jsonl'
    path.write_text(sink.getvalue())

    assert first['operation_outcome'] == second['operation_outcome'] == 'confirmed'
    with pytest.raises(ValueError, match='not finalized'):
        summarize_metrics(path)
    partial = summarize_metrics(path, allow_incomplete=True)
    assert partial['capture_complete'] is False
    assert partial['tool_calls'] == 1


@pytest.mark.parametrize(('lines', 'message'), [
    ([{'schema_version': 1, 'kind': 'capture_end', 'tool_calls': 1}], 'completion count'),
    ([{'schema_version': 1, 'kind': 'capture_end', 'tool_calls': 0},
      {'schema_version': 1, 'kind': 'capture_end', 'tool_calls': 0}], 'follows its completion marker'),
])
def test_metrics_reject_mismatched_counts_or_records_after_completion(tmp_path, lines, message):
    path = tmp_path / 'invalid.jsonl'
    path.write_text(''.join(json.dumps(line) + '\n' for line in lines))

    with pytest.raises(ValueError, match=message):
        summarize_metrics(path, allow_incomplete=True)


@pytest.mark.parametrize('error_type', [KeyboardInterrupt, RuntimeError])
def test_interrupted_server_never_certifies_its_metrics_capture(tmp_path, error_type):
    path = tmp_path / 'interrupted.jsonl'
    api = MagicMock()
    with patch('sys.argv', ['openrct2-mcp', '--metrics-file', str(path)]), \
         patch.object(server, 'api_client', api), patch.object(server.mcp, 'run', side_effect=error_type):
        with pytest.raises(error_type):
            server.main()

    api.close.assert_called_once()
    assert server.result_middleware.sink is None
    with pytest.raises(ValueError, match='not finalized'):
        summarize_metrics(path)
