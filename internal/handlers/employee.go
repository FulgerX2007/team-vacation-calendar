package handlers

import (
	"net/http"
	"strconv"

	"vacation_calendar/internal/models"
	"vacation_calendar/internal/repository"

	"github.com/gin-gonic/gin"
)

type EmployeeHandler struct {
	repo repository.EmployeeRepository
}

func NewEmployeeHandler() EmployeeHandler {
	return EmployeeHandler{
		repo: repository.NewEmployeeRepository(),
	}
}

type CreateEmployeeRequest struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color"`
}

type UpdateEmployeeRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

func (h EmployeeHandler) GetAll(c *gin.Context) {
	employees, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, employees)
}

func (h EmployeeHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	employee, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		return
	}
	c.JSON(http.StatusOK, employee)
}

func (h EmployeeHandler) Create(c *gin.Context) {
	var req CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee := models.Employee{
		Name:  req.Name,
		Color: req.Color,
	}

	if employee.Color == "" {
		employee.Color = "#3498db"
	}

	created, err := h.repo.Create(employee)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h EmployeeHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	employee, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		return
	}

	var req UpdateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		employee.Name = req.Name
	}
	if req.Color != "" {
		employee.Color = req.Color
	}

	updated, err := h.repo.Update(employee)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func (h EmployeeHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	vacationRepo := repository.NewVacationRepository()
	if err := vacationRepo.DeleteByEmployeeID(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "employee deleted"})
}
