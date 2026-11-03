"""Fixture preparation reserves outputs before construction and retains failures."""

import importlib.util
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from openrct2_mcp.trials import TrialPreparationError

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('prepare_trial_script', ROOT / 'scripts' / 'prepare_trial.py')
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


def arguments(output):
    return ['prepare_trial.py', '--fixture', str(ROOT / 'benchmarks/fixtures/continue-coaster.json'),
            '--output-dir', str(output)]


def test_preparation_writes_a_separate_agent_brief_without_the_setup_recipe(tmp_path):
    output = tmp_path / 'trial'
    report = {'created_ride_ids': [0], 'ride_id': 0, 'brief': {'prompt': 'Continue ride 0'},
              'initial_state': {'piece_count': 8}}
    with patch('sys.argv', arguments(output) + ['--yes']), \
         patch.object(script, 'run', AsyncMock(return_value=report)) as run:
        result = script.main()

    assert result == 0
    assert json.loads((output / 'setup.json').read_text()) == report
    assert json.loads((output / 'brief.json').read_text()) == report['brief']
    assert run.await_count == 1


def test_preparation_reports_retained_ids_even_when_creation_partially_failed(tmp_path, capsys):
    output = tmp_path / 'trial'
    with patch('sys.argv', arguments(output) + ['--yes']), \
         patch.object(script, 'run', AsyncMock(side_effect=TrialPreparationError('Station outcome unknown', [0, 7]))):
        result = script.main()

    assert result == 2
    assert json.loads((output / 'failure.json').read_text())['retained_ride_ids'] == [0, 7]
    assert '[0, 7]' in capsys.readouterr().err
    assert not (output / 'brief.json').exists()


def test_preparation_refuses_an_existing_output_directory_before_construction(tmp_path):
    output = tmp_path / 'trial'
    output.mkdir()
    with patch('sys.argv', arguments(output) + ['--yes']), patch.object(script, 'run', AsyncMock()) as run:
        with pytest.raises(SystemExit) as failure:
            script.main()

    assert failure.value.code == 2
    run.assert_not_awaited()


def test_declining_fixture_preparation_does_not_create_outputs_or_rides(tmp_path):
    output = tmp_path / 'trial'
    with patch('sys.argv', arguments(output)), patch('builtins.input', return_value='no'), \
         patch.object(script, 'run', AsyncMock()) as run:
        result = script.main()

    assert result == 130
    assert not output.exists()
    run.assert_not_awaited()
