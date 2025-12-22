package repository

import (
	"vacation_calendar/internal/database"
	"vacation_calendar/internal/models"
)

type EmployeeRepository struct{}

func NewEmployeeRepository() EmployeeRepository {
	return EmployeeRepository{}
}

func (r EmployeeRepository) GetAll() ([]models.Employee, error) {
	var employees []models.Employee
	result := database.GetDB().Find(&employees)
	return employees, result.Error
}

func (r EmployeeRepository) GetByID(id uint) (models.Employee, error) {
	var employee models.Employee
	result := database.GetDB().First(&employee, id)
	return employee, result.Error
}

func (r EmployeeRepository) Create(employee models.Employee) (models.Employee, error) {
	result := database.GetDB().Create(&employee)
	return employee, result.Error
}

func (r EmployeeRepository) Update(employee models.Employee) (models.Employee, error) {
	result := database.GetDB().Save(&employee)
	return employee, result.Error
}

func (r EmployeeRepository) Delete(id uint) error {
	result := database.GetDB().Delete(&models.Employee{}, id)
	return result.Error
}

func (r EmployeeRepository) GetAllWithVacations() ([]models.Employee, error) {
	var employees []models.Employee
	result := database.GetDB().Preload("Vacations").Find(&employees)
	return employees, result.Error
}
