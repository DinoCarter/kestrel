# Weather Decision Support Tool

A web-based decision aid for OSU Emergency Management to evaluate weather risk across university campuses. The tool aggregates forecast inputs into consistent risk scores, reducing reliance on institutional memory and providing a documented basis for operational decisions.

## Overview

The tool scores three risk dimensions from manually entered forecast data:

- **Campus Operations** — informs closure, delayed start, and early release decisions
- **Outdoor Exposure** — informs decisions about events, tours, and outdoor work
- **Road & Travel** — informs communication to commuter students and staff

Each score maps to a four-level stoplight (Green / Yellow / Orange / Red) with a plain-English condition summary explaining the contributing factors.

## Current Coverage

| County | Campus |
|---|---|
| Payne County | Stillwater |
| Tulsa County | Tulsa |
| Cherokee County | Tahlequah |

## Data Sources (Manual Entry)

- NWS alerts: [forecast.weather.gov](https://forecast.weather.gov)
- WBGT / lightning: Perry Weather (OSU subscription)

## Disclaimer

This tool supports decision-making — it does not make decisions. Final authority for campus operations and outdoor activity suspension rests with university leadership. Assessments should be retained as part of the formal decision record.

## Roadmap

- NWS and Oklahoma Mesonet API integration
- Perry Weather API integration (WBGT, lightning)
- User authentication and assessment history
- Multi-campus dashboard view

---

*OSU Office of Emergency Management*
