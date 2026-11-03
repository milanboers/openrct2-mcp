"""Read-only benchmark collection and report writing."""

import asyncio
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from openrct2_mcp.benchmark import BenchmarkBrief

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('evaluate_ride_script', ROOT / 'scripts' / 'evaluate_ride.py')
evaluator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evaluator)
BRIEF = BenchmarkBrief.model_validate_json((ROOT / 'benchmarks' / 'working-coaster.json').read_text())


class ReadOnlyClient:
    def __init__(self, park_name='sandbox', changed=False):
        self.calls = []
        self.park_name = park_name
        self.changed = changed
        self.state_reads = 0

    async def call_tool(self, name, arguments):
        assert name in ('get_plugin_info', 'get_coaster_state', 'get_ride_stats')
        self.calls.append((name, arguments))
        state = {
            'success': True, 'ride_id': 7, 'ride_type': 52, 'piece_count': 42,
            'layout_status': 'complete', 'is_circuit_complete': True,
            'track_elements': [{'x': 67, 'y': 66, 'z': 14}],
        }
        responses = {
            'get_plugin_info': {'matches': True, 'protocol_compatible': True, 'park_name': self.park_name},
            'get_coaster_state': state,
            'get_ride_stats': {'ride_status': 'testing', 'game_paused': False, 'ratings_available': True,
                               'excitement': 3.5, 'intensity': 4.0, 'nausea': 1.0, 'vehicles': [{'velocity': 100}]},
        }
        if name == 'get_coaster_state':
            self.state_reads += 1
            if self.changed and self.state_reads == 2:
                state['piece_count'] = 43
        return SimpleNamespace(is_error=False,
                               content=[SimpleNamespace(type='text', text=json.dumps(responses[name]))])


def test_collection_grades_a_stable_ride_using_only_read_tools():
    client = ReadOnlyClient()

    result = asyncio.run(evaluator.collect(client, BRIEF, 7, 0))

    assert result['passed'] is True
    assert result['evidence']['state']['piece_count'] == 42
    assert result['evidence']['stats_samples'][0]['excitement'] == 3.5
    assert result['plugin']['park_name'] == 'sandbox'
    assert result['observed_at']
    assert [name for name, _ in client.calls] == [
        'get_plugin_info', 'get_coaster_state', 'get_ride_stats', 'get_coaster_state',
    ]
    assert client.calls[1][1] == {'ride_id': 7, 'include_image': False}


def test_collection_refuses_wrong_park_before_reading_a_ride():
    client = ReadOnlyClient(park_name='another park')

    with pytest.raises(RuntimeError, match='Expected park'):
        asyncio.run(evaluator.collect(client, BRIEF, 7, 0))

    assert [name for name, _ in client.calls] == ['get_plugin_info']


def test_collection_refuses_changed_layout_instead_of_scoring_mixed_evidence():
    client = ReadOnlyClient(changed=True)

    with pytest.raises(RuntimeError, match='layout changed'):
        asyncio.run(evaluator.collect(client, BRIEF, 7, 0))


@pytest.mark.parametrize(('passed', 'exit_code'), [(True, 0), (False, 1)])
def test_cli_writes_a_new_report_with_explicit_agent_label(tmp_path, passed, exit_code):
    output = tmp_path / 'result.json'
    report = {'schema_version': 1, 'passed': passed}
    arguments = ['evaluate_ride.py', '--brief', str(ROOT / 'benchmarks' / 'working-coaster.json'),
                 '--ride-id', '7', '--output', str(output), '--agent-label', 'manual-run']
    with patch('sys.argv', arguments), patch.object(evaluator, 'run', AsyncMock(return_value=deepcopy(report))) as run:
        result = evaluator.main()

    assert result == exit_code
    assert json.loads(output.read_text()) == {**report, 'agent_label': 'manual-run'}
    run.assert_awaited_once_with(BRIEF, 7, 10)


def test_cli_never_overwrites_an_existing_report(tmp_path):
    output = tmp_path / 'result.json'
    output.write_text('previous result')
    arguments = ['evaluate_ride.py', '--brief', 'unused.json', '--ride-id', '7', '--output', str(output)]
    with patch('sys.argv', arguments), patch.object(evaluator, 'run', AsyncMock()) as run:
        with pytest.raises(SystemExit) as failure:
            evaluator.main()

    assert failure.value.code == 2
    assert output.read_text() == 'previous result'
    run.assert_not_awaited()
