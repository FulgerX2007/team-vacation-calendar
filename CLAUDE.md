# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Team Vacation Calendar is a Go web application for managing employee vacations with calendar visualization. It uses Gin for HTTP routing, GORM with SQLite for persistence, and generates PNG calendar images showing vacation periods.

## Development Commands

```bash
# Run the application (starts on http://localhost:8080)
go run main.go

# Build binary
go build -o vacation_calendar main.go

# Install/update dependencies
go mod download
go mod tidy

# Run tests (when added)
go test ./...

# Run single test
go test -v ./internal/services -run TestCalendarGeneration
```

## Architecture

```
main.go                     # Entry point - Gin router setup
internal/
├── models/                 # GORM data structures (Employee, Vacation)
├── database/               # DB initialization with auto-migration
├── repository/             # Data access layer (CRUD operations)
├── handlers/               # HTTP request handlers
└── services/               # Business logic (calendar PNG generation)
templates/                  # Go HTML templates
static/{css,js}/            # Frontend assets (vanilla JS, CSS)
```

**Data Flow**: HTTP Request → Handler → Repository → GORM → SQLite

**Key Relationships**:
- Employee has many Vacations (1:N)
- Deleting an employee cascades to their vacations

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/employees | List/create employees |
| GET/PUT/DELETE | /api/employees/:id | Employee CRUD |
| GET/POST | /api/vacations | List/create vacations (supports `?from=&to=` filtering) |
| GET/PUT/DELETE | /api/vacations/:id | Vacation CRUD |
| GET | /api/calendar/generate | Generate PNG calendar (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) |

## Technology Stack

- **Backend**: Go 1.25, Gin v1.9, GORM v1.25
- **Database**: SQLite (auto-created as `vacation_calendar.db`)
- **Image Generation**: fogleman/gg (2D graphics), golang/freetype (fonts)
- **Frontend**: Vanilla JavaScript, Fetch API, HTML templates

## Calendar Generation

The `internal/services/calendar.go` service generates PNG images with:
- Employees as rows, days as columns
- Weekend background highlighting
- Color-coded vacation bars per employee
- Configurable constants: `leftMargin: 150px`, `rowHeight: 40px`, `dayWidth: 30px`
