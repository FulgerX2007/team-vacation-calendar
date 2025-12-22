package repository

import (
	"time"

	"vacation_calendar/internal/database"
	"vacation_calendar/internal/models"
)

type VacationRepository struct{}

func NewVacationRepository() VacationRepository {
	return VacationRepository{}
}

func (r VacationRepository) GetAll() ([]models.Vacation, error) {
	var vacations []models.Vacation
	result := database.GetDB().Preload("Employee").Find(&vacations)
	return vacations, result.Error
}

func (r VacationRepository) GetByID(id uint) (models.Vacation, error) {
	var vacation models.Vacation
	result := database.GetDB().Preload("Employee").First(&vacation, id)
	return vacation, result.Error
}

func (r VacationRepository) GetByDateRange(from, to time.Time) ([]models.Vacation, error) {
	var vacations []models.Vacation
	result := database.GetDB().Preload("Employee").
		Where("start_date <= ? AND end_date >= ?", to, from).
		Find(&vacations)
	return vacations, result.Error
}

func (r VacationRepository) GetByEmployeeID(employeeID uint) ([]models.Vacation, error) {
	var vacations []models.Vacation
	result := database.GetDB().Where("employee_id = ?", employeeID).Find(&vacations)
	return vacations, result.Error
}

func (r VacationRepository) Create(vacation models.Vacation) (models.Vacation, error) {
	result := database.GetDB().Create(&vacation)
	return vacation, result.Error
}

func (r VacationRepository) Update(vacation models.Vacation) (models.Vacation, error) {
	result := database.GetDB().Save(&vacation)
	return vacation, result.Error
}

func (r VacationRepository) Delete(id uint) error {
	result := database.GetDB().Delete(&models.Vacation{}, id)
	return result.Error
}

func (r VacationRepository) DeleteByEmployeeID(employeeID uint) error {
	result := database.GetDB().Where("employee_id = ?", employeeID).Delete(&models.Vacation{})
	return result.Error
}
