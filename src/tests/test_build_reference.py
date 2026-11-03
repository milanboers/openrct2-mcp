"""Reference CLI consent and report-file safety."""

import importlib.util
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('build_reference_script', ROOT / 'scripts' / 'build_reference.py')
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


def arguments(output):
    return ['build_reference.py', '--brief', str(ROOT / 'benchmarks' / 'working-coaster.json'),
            '--reference', str(ROOT / 'benchmarks' / 'references' / 'working-coaster.json'), '--output', str(output)]


@pytest.mark.parametrize(('passed', 'exit_code'), [(True, 0), (False, 1)])
def test_cli_builds_only_after_explicit_confirmation_and_writes_a_new_report(tmp_path, passed, exit_code):
    output = tmp_path / 'result.json'
    with patch('sys.argv', arguments(output) + ['--yes']), \
         patch.object(script, 'run', AsyncMock(return_value={'passed': passed})) as run:
        result = script.main()

    assert result == exit_code
    assert json.loads(output.read_text()) == {'passed': passed}
    assert run.await_args.args[0].id == 'working-coaster'
    assert run.await_args.args[1].brief_id == 'working-coaster'
    assert run.await_args.args[2] == 180


def test_cli_cancellation_does_not_contact_the_game(tmp_path):
    output = tmp_path / 'result.json'
    with patch('sys.argv', arguments(output)), patch('builtins.input', return_value='no'), \
         patch.object(script, 'run', AsyncMock()) as run:
        result = script.main()

    assert result == 130
    run.assert_not_awaited()
    assert not output.exists()


def test_cli_never_overwrites_a_previous_report_or_builds_when_it_exists(tmp_path):
    output = tmp_path / 'result.json'
    output.write_text('previous result')
    with patch('sys.argv', arguments(output) + ['--yes']), patch.object(script, 'run', AsyncMock()) as run:
        with pytest.raises(SystemExit) as error:
            script.main()

    assert error.value.code == 2
    assert output.read_text() == 'previous result'
    run.assert_not_awaited()


def test_cli_missing_report_directory_does_not_start_construction(tmp_path):
    output = tmp_path / 'missing' / 'result.json'
    with patch('sys.argv', arguments(output) + ['--yes']), patch.object(script, 'run', AsyncMock()) as run:
        with pytest.raises(SystemExit) as error:
            script.main()

    assert error.value.code == 2
    run.assert_not_awaited()
    assert not output.exists()
