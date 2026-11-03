"""Guest calibration never resets parks, reuses outputs or builds without consent."""

import importlib.util
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

spec = importlib.util.spec_from_file_location('guest_smoke_script', Path(__file__).resolve().parents[2] / 'scripts/guest_smoke_test.py')
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


def test_guest_smoke_cancellation_does_not_contact_game_or_create_output(tmp_path):
    output = tmp_path / 'trial'
    with patch('sys.argv', ['guest_smoke_test.py', '--output-dir', str(output)]), \
         patch('builtins.input', return_value='no'), patch.object(script, 'run', AsyncMock()) as run:
        result = script.main()

    assert result == 130
    assert not output.exists()
    run.assert_not_awaited()


def test_guest_smoke_rejects_reused_output_before_game_contact(tmp_path):
    with patch('sys.argv', ['guest_smoke_test.py', '--output-dir', str(tmp_path), '--yes']), \
         patch.object(script, 'run', AsyncMock()) as run:
        result = script.main()

    assert result == 2
    run.assert_not_awaited()


def test_guest_smoke_records_partial_failure_without_retry_or_cleanup(tmp_path):
    output = tmp_path / 'trial'
    with patch('sys.argv', ['guest_smoke_test.py', '--port', '8081', '--output-dir', str(output), '--yes']), \
         patch.object(script, 'run', AsyncMock(side_effect=RuntimeError('Ride 7 retained'))) as run:
        result = script.main()

    assert result == 1
    assert json.loads((output / 'failure.json').read_text()) == {'error': 'Ride 7 retained', 'partial_work_retained': True}
    run.assert_awaited_once_with(8081, output, 240)


@pytest.mark.parametrize('timeout', ['0', 'nan', 'inf'])
def test_guest_smoke_rejects_invalid_timeout_before_creating_output(tmp_path, timeout):
    output = tmp_path / 'trial'
    with patch('sys.argv', ['guest_smoke_test.py', '--output-dir', str(output), '--timeout', timeout, '--yes']), \
         patch.object(script, 'run', AsyncMock()) as run:
        with pytest.raises(SystemExit):
            script.main()

    assert not output.exists()
    run.assert_not_awaited()
