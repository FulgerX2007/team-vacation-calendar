package handlers

import (
	"net/http"
	"strconv"
	"time"

	"vacation_calendar/internal/models"
	"vacation_calendar/internal/repository"

	"github.com/gin-gonic/gin"
)

type VacationHandler struct {
	repo repository.VacationRepository
}

func NewVacationHandler() VacationHandler {
	return VacationHandler{
		repo: repository.NewVacationRepository(),
	}
}

type CreateVacationRequest struct {
	EmployeeID  uint   `json:"employee_id" binding:"required"`
	StartDate   string `json:"start_date" binding:"required"`
	EndDate     string `json:"end_date" binding:"required"`
	Description string `json:"description"`
}

type UpdateVacationRequest struct {
	EmployeeID  uint   `json:"employee_id"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
	Description string `json:"description"`
}

func (h VacationHandler) GetAll(c *gin.Context) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	if fromStr != "" && toStr != "" {
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

		vacations, err := h.repo.GetByDateRange(from, to)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, vacations)
		return
	}

	vacations, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, vacations)
}

func (h VacationHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	vacation, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vacation not found"})
		return
	}
	c.JSON(http.StatusOK, vacation)
}

func (h VacationHandler) Create(c *gin.Context) {
	var req CreateVacationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format, use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format, use YYYY-MM-DD"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be after start_date"})
		return
	}

	employeeRepo := repository.NewEmployeeRepository()
	_, err = employeeRepo.GetByID(req.EmployeeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "employee not found"})
		return
	}

	vacation := models.Vacation{
		EmployeeID:  req.EmployeeID,
		StartDate:   startDate,
		EndDate:     endDate,
		Description: req.Description,
	}

	created, err := h.repo.Create(vacation)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h VacationHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	vacation, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vacation not found"})
		return
	}

	var req UpdateVacationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.EmployeeID != 0 {
		employeeRepo := repository.NewEmployeeRepository()
		_, err = employeeRepo.GetByID(req.EmployeeID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "employee not found"})
			return
		}
		vacation.EmployeeID = req.EmployeeID
	}

	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format, use YYYY-MM-DD"})
			return
		}
		vacation.StartDate = startDate
	}

	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format, use YYYY-MM-DD"})
			return
		}
		vacation.EndDate = endDate
	}

	if vacation.EndDate.Before(vacation.StartDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be after start_date"})
		return
	}

	vacation.Description = req.Description

	updated, err := h.repo.Update(vacation)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func (h VacationHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "vacation deleted"})
}
