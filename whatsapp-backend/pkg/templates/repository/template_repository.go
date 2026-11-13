package template_repository

import (
	template_model "github.com/evolution-foundation/evolution-go/pkg/templates/model"
	"gorm.io/gorm"
)

type TemplateRepository interface {
	GetByName(name string) (*template_model.MessageTemplate, error)
	CreateOrUpdate(template *template_model.MessageTemplate) error
	GetAll() ([]template_model.MessageTemplate, error)
}

type templateRepository struct {
	db *gorm.DB
}

func (r *templateRepository) GetByName(name string) (*template_model.MessageTemplate, error) {
	var tmpl template_model.MessageTemplate
	err := r.db.Where("name = ? AND is_active = true", name).First(&tmpl).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &tmpl, nil
}

func (r *templateRepository) CreateOrUpdate(template *template_model.MessageTemplate) error {
	var existing template_model.MessageTemplate
	err := r.db.Where("name = ?", template.Name).First(&existing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return r.db.Create(template).Error
		}
		return err
	}

	return r.db.Model(&existing).Updates(map[string]interface{}{
		"content":   template.Content,
		"is_active": template.IsActive,
	}).Error
}

func (r *templateRepository) GetAll() ([]template_model.MessageTemplate, error) {
	var tmpls []template_model.MessageTemplate
	err := r.db.Find(&tmpls).Error
	return tmpls, err
}

func NewTemplateRepository(db *gorm.DB) TemplateRepository {
	return &templateRepository{db: db}
}
