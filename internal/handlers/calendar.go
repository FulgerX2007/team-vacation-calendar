package handlers

import (
	"net/http"
	"time"

	"vacation_calendar/internal/services"

	"github.com/gin-gonic/gin"
)

type CalendarHandler struct {
	service services.CalendarService
}

func NewCalendarHandler() CalendarHandler {
	return CalendarHandler{
		service: services.NewCalendarService(),
	}
}

func (h CalendarHandler) Generate(c *gin.Context) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	if fromStr == "" || toStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from and to query parameters are required"})
		return
	}

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid from date format, use YYYY-MM-DD"})
		return
	}

	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid to date format, use YYYY-MM-DD"})
		return
	}

	if to.Before(from) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to date must be after from date"})
		return
	}

	imgBytes, err := h.service.GenerateCalendar(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "image/png")
	c.Header("Content-Disposition", "attachment; filename=vacation_calendar.png")
	c.Data(http.StatusOK, "image/png", imgBytes)
}
