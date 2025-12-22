package services

import (
	"bytes"
	"fmt"
	"image/color"
	"image/png"
	"strconv"
	"time"

	"vacation_calendar/internal/models"
	"vacation_calendar/internal/repository"

	"github.com/fogleman/gg"
)

const fontPath = "fonts/Roboto-Regular.ttf"
const fontPathBold = "fonts/Roboto-Bold.ttf"

type CalendarService struct {
	employeeRepo repository.EmployeeRepository
	vacationRepo repository.VacationRepository
}

func NewCalendarService() CalendarService {
	return CalendarService{
		employeeRepo: repository.NewEmployeeRepository(),
		vacationRepo: repository.NewVacationRepository(),
	}
}

const (
	leftMargin    = 150
	topMargin     = 60
	rowHeight     = 40
	dayWidth      = 30
	headerHeight  = 50
	bottomPadding = 20
)

func (s CalendarService) GenerateCalendar(from, to time.Time) ([]byte, error) {
	employees, err := s.employeeRepo.GetAll()
	if err != nil {
		return nil, err
	}

	vacations, err := s.vacationRepo.GetByDateRange(from, to)
	if err != nil {
		return nil, err
	}

	vacationMap := make(map[uint][]struct {
		Start time.Time
		End   time.Time
	})
	for _, v := range vacations {
		vacationMap[v.EmployeeID] = append(vacationMap[v.EmployeeID], struct {
			Start time.Time
			End   time.Time
		}{v.StartDate, v.EndDate})
	}

	days := int(to.Sub(from).Hours()/24) + 1
	width := leftMargin + days*dayWidth + 20
	height := topMargin + headerHeight + len(employees)*rowHeight + bottomPadding

	if width < 800 {
		width = 800
	}
	if height < 200 {
		height = 200
	}

	dc := gg.NewContext(width, height)

	dc.SetColor(color.White)
	dc.Clear()

	// Load bold font for title
	if err := dc.LoadFontFace(fontPathBold, 18); err != nil {
		return nil, fmt.Errorf("failed to load font: %w", err)
	}

	dc.SetColor(color.Black)
	dc.DrawStringAnchored("Team Vacation Calendar", float64(width)/2, 25, 0.5, 0.5)

	// Load regular font for the rest
	if err := dc.LoadFontFace(fontPath, 12); err != nil {
		return nil, fmt.Errorf("failed to load font: %w", err)
	}

	s.drawDateHeaders(dc, from, days)
	s.drawWeekendBackground(dc, from, days, len(employees))
	s.drawEmployeeRows(dc, employees, vacationMap, from, to, days)
	s.drawGrid(dc, days, len(employees))

	img := dc.Image()
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func (s CalendarService) drawDateHeaders(dc *gg.Context, from time.Time, days int) {
	dc.SetColor(color.Black)

	for i := 0; i < days; i++ {
		date := from.AddDate(0, 0, i)
		x := float64(leftMargin + i*dayWidth + dayWidth/2)

		dayStr := strconv.Itoa(date.Day())
		dc.DrawStringAnchored(dayStr, x, float64(topMargin+15), 0.5, 0.5)

		if date.Day() == 1 || i == 0 {
			monthStr := date.Format("Jan")
			dc.DrawStringAnchored(monthStr, x, float64(topMargin+35), 0.5, 0.5)
		}
	}
}

func (s CalendarService) drawWeekendBackground(dc *gg.Context, from time.Time, days int, employeeCount int) {
	weekendColor := color.RGBA{240, 240, 240, 255}

	for i := 0; i < days; i++ {
		date := from.AddDate(0, 0, i)
		if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
			x := float64(leftMargin + i*dayWidth)
			y := float64(topMargin + headerHeight)
			h := float64(employeeCount * rowHeight)

			dc.SetColor(weekendColor)
			dc.DrawRectangle(x, y, float64(dayWidth), h)
			dc.Fill()
		}
	}
}

func (s CalendarService) drawEmployeeRows(dc *gg.Context, employees []models.Employee, vacationMap map[uint][]struct {
	Start time.Time
	End   time.Time
}, from, to time.Time, days int) {
	for i, emp := range employees {
		y := float64(topMargin + headerHeight + i*rowHeight)

		dc.SetColor(color.Black)
		dc.DrawStringAnchored(emp.Name, float64(leftMargin-10), y+float64(rowHeight)/2, 1, 0.5)

		empColor := parseHexColor(emp.Color)
		if vacations, ok := vacationMap[emp.ID]; ok {
			for _, v := range vacations {
				s.drawVacationBar(dc, v.Start, v.End, from, to, y, empColor)
			}
		}
	}
}

func (s CalendarService) drawVacationBar(dc *gg.Context, start, end, from, to time.Time, y float64, barColor color.Color) {
	if start.Before(from) {
		start = from
	}
	if end.After(to) {
		end = to
	}

	startDay := int(start.Sub(from).Hours() / 24)
	endDay := int(end.Sub(from).Hours()/24) + 1

	x := float64(leftMargin + startDay*dayWidth)
	w := float64((endDay - startDay) * dayWidth)
	h := float64(rowHeight - 10)
	barY := y + 5

	dc.SetColor(barColor)
	dc.DrawRoundedRectangle(x+2, barY, w-4, h, 5)
	dc.Fill()
}

func (s CalendarService) drawGrid(dc *gg.Context, days int, employeeCount int) {
	dc.SetColor(color.RGBA{200, 200, 200, 255})
	dc.SetLineWidth(0.5)

	for i := 0; i <= days; i++ {
		x := float64(leftMargin + i*dayWidth)
		y1 := float64(topMargin + headerHeight)
		y2 := float64(topMargin + headerHeight + employeeCount*rowHeight)
		dc.DrawLine(x, y1, x, y2)
		dc.Stroke()
	}

	for i := 0; i <= employeeCount; i++ {
		y := float64(topMargin + headerHeight + i*rowHeight)
		x1 := float64(leftMargin)
		x2 := float64(leftMargin + days*dayWidth)
		dc.DrawLine(x1, y, x2, y)
		dc.Stroke()
	}
}

func parseHexColor(hex string) color.Color {
	if len(hex) == 0 {
		return color.RGBA{52, 152, 219, 255}
	}

	if hex[0] == '#' {
		hex = hex[1:]
	}

	if len(hex) != 6 {
		return color.RGBA{52, 152, 219, 255}
	}

	r, _ := strconv.ParseUint(hex[0:2], 16, 8)
	g, _ := strconv.ParseUint(hex[2:4], 16, 8)
	b, _ := strconv.ParseUint(hex[4:6], 16, 8)

	return color.RGBA{uint8(r), uint8(g), uint8(b), 255}
}
