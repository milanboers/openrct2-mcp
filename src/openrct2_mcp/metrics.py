"""Opt-in local tool metrics. Never record arguments, conversations or image data."""

import asyncio
from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
import time
from typing import Any, Literal, Optional, TextIO

from fastmcp.server.middleware import Middleware, MiddlewareContext, CallNext
from fastmcp.tools.base import ToolResult
from pydantic import BaseModel, ConfigDict, Field

from .results import Outcome

logger = logging.getLogger(__name__)
PLACEMENT_TOOLS = {
    'create_ride', 'place_track_segment', 'place_track_sequence',
    'place_path_tile', 'place_path_sequence', 'place_station_building',
}
REMOVAL_TOOLS = {'undo_last_piece', 'remove_terminal_piece', 'remove_path_tile'}


class ToolMetric(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False)

    schema_version: int = Field(ge=1, le=1)
    tool: str
    completed_at: str
    duration_seconds: float = Field(ge=0)
    tool_success: bool
    tool_error: Optional[str]
    operation_outcome: Optional[Outcome]
    requested_placements: int = Field(ge=0)
    confirmed_placements: int = Field(ge=0)
    rejected_placement_requests: int = Field(ge=0)
    unknown_placements: int = Field(ge=0)
    confirmed_removals: int = Field(ge=0)
    query_candidates: int = Field(ge=0)
    blocked_query_candidates: int = Field(ge=0)
    response_text_bytes: int = Field(ge=0)
    response_image_base64_chars: int = Field(ge=0)


class CaptureEnd(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    schema_version: int = Field(default=1, ge=1, le=1)
    kind: Literal['capture_end'] = 'capture_end'
    tool_calls: int = Field(ge=0)


def result_summary(result: ToolResult) -> Optional[dict[str, Any]]:
    for block in result.content:
        if block.type != 'text':
            continue
        try:
            value = json.loads(block.text)
        except ValueError:
            continue
        if isinstance(value, dict):
            return value
    return None


class ResultMiddleware(Middleware):
    """Add structured state content and optionally record one metrics line per call."""

    def __init__(self, sink: Optional[TextIO] = None):
        self.sink = sink

    @property
    def sink(self) -> Optional[TextIO]:
        return self._sink

    @sink.setter
    def sink(self, sink: Optional[TextIO]) -> None:
        self._sink = sink
        self._recorded_calls = 0

    def finish_capture(self) -> None:
        """Finalize only a healthy capture after the server returns normally."""
        if self.sink is not None:
            try:
                self.sink.write(CaptureEnd(tool_calls=self._recorded_calls).model_dump_json() + '\n')
                self.sink.flush()
            except (OSError, ValueError):
                logger.warning('Tool metrics finalization failed; capture is incomplete')
            finally:
                self.sink = None

    async def on_call_tool(self, context: MiddlewareContext, call_next: CallNext) -> ToolResult:
        started = time.monotonic()
        result = None
        error_type = None
        try:
            result = await call_next(context)
            summary = result_summary(result)
            if result.structured_content is None and summary is not None:
                result.structured_content = summary
            return result
        except (Exception, asyncio.CancelledError) as error:
            error_type = type(error).__name__
            raise
        finally:
            if self.sink is not None:
                try:
                    self.record(context.message.name, context.message.arguments or {}, result, error_type,
                                time.monotonic() - started)
                except Exception:
                    # Instrumentation must not hide an action result or its original error.
                    logger.warning('Tool metrics recording failed; disabling metrics for this process')
                    self.sink = None

    def record(
        self, tool: str, arguments: dict[str, Any], result: Optional[ToolResult],
        error_type: Optional[str], duration: float,
    ) -> None:
        summary = (result_summary(result) if result is not None else None) or {}
        outcome = summary.get('operation_outcome')
        placements = tool in PLACEMENT_TOOLS
        sequence = tool in {'place_track_sequence', 'place_path_sequence'}
        segments = arguments.get('tiles' if tool == 'place_path_sequence' else 'segments')
        candidates = arguments.get('candidates')
        requested = (len(segments) if isinstance(segments, list) else 0) if sequence else int(placements)
        confirmed = summary.get('placed_count', 0) if sequence else int(
            placements and outcome == 'confirmed'
        )
        query_results = summary.get('results', []) if tool == 'check_track_candidates' else [summary]
        queries = (len(candidates) if isinstance(candidates, list) else 0) if tool == 'check_track_candidates' else int(
            tool == 'check_track_segment'
        )
        event = ToolMetric(
            schema_version=1, tool=tool, completed_at=datetime.now(timezone.utc).isoformat(), duration_seconds=duration,
            tool_success=error_type is None and result is not None and not result.is_error and
                         summary.get('success') is not False,
            tool_error=error_type, operation_outcome=outcome, requested_placements=requested,
            confirmed_placements=confirmed, rejected_placement_requests=int(placements and outcome == 'rejected'),
            unknown_placements=int(placements and outcome == 'unknown'),
            confirmed_removals=int(tool in REMOVAL_TOOLS and outcome == 'confirmed'),
            query_candidates=queries,
            blocked_query_candidates=sum(item.get('placeable') is False for item in query_results) if queries else 0,
            response_text_bytes=sum(len(block.text.encode('utf-8')) for block in result.content
                                    if block.type == 'text') if result is not None else 0,
            response_image_base64_chars=sum(len(block.data) for block in result.content
                                            if block.type == 'image') if result is not None else 0,
        )
        self.sink.write(event.model_dump_json() + '\n')
        self.sink.flush()
        self._recorded_calls += 1


def summarize_metrics(path: Path, *, allow_incomplete: bool = False) -> dict[str, Any]:
    data = path.read_bytes()
    events = []
    end = None
    for line in data.splitlines():
        if not line.strip():
            continue
        if end is not None:
            raise ValueError('Metrics data follows its completion marker')
        value = json.loads(line.decode('utf-8'))
        if isinstance(value, dict) and value.get('kind') == 'capture_end':
            end = CaptureEnd.model_validate(value)
        else:
            events.append(ToolMetric.model_validate(value))
    if end is not None and end.tool_calls != len(events):
        raise ValueError('Metrics completion count does not match recorded calls')
    if end is None and not allow_incomplete:
        raise ValueError('Metrics capture is not finalized. Stop the server cleanly or explicitly allow incomplete metrics.')
    if not events:
        raise ValueError('Metrics file contains no completed tool calls')
    count_fields = (
        'requested_placements', 'confirmed_placements', 'rejected_placement_requests', 'unknown_placements',
        'confirmed_removals', 'query_candidates', 'blocked_query_candidates', 'response_text_bytes',
        'response_image_base64_chars',
    )
    return {
        'schema_version': 1, 'sha256': hashlib.sha256(data).hexdigest(), 'tool_calls': len(events),
        'capture_complete': end is not None,
        'tool_failures': sum(not event.tool_success for event in events),
        'summed_call_seconds': sum(event.duration_seconds for event in events),
        **{field: sum(getattr(event, field) for event in events) for field in count_fields},
        'limitations': 'Counts cover this server process, not proven agent/ride ownership. '
                       'Rejected placement requests include preflight rejection. '
                       'Summed call durations are not elapsed trial time or token usage. '
                       'Exceptions/cancellations may leave unacknowledged effects unknown.',
    }
