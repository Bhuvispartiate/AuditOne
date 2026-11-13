package template_service

import (
	"fmt"
	"strings"

	template_model "github.com/evolution-foundation/evolution-go/pkg/templates/model"
	template_repository "github.com/evolution-foundation/evolution-go/pkg/templates/repository"
)

const (
	TemplatePaymentConfirmation = "payment_confirmation"
)

var defaultTemplates = map[string]string{
	TemplatePaymentConfirmation: `Hi {{student_name}}! 👋

🎉 Payment Successful!

Your payment of ₹{{amount}} for {{event_name}} has been successfully received.

✅ Your registration is confirmed.

🆔 Registration ID: {{registration_id}}

You will receive further event updates on this WhatsApp number.

Thank you!
OXEV Team 🚀`,
}

type TemplateService interface {
	Render(templateName string, variables map[string]interface{}) (string, error)
	RenderCustom(templateContent string, variables map[string]interface{}) string
	GetTemplate(name string) (string, error)
	SeedDefaultTemplates() error
}

type templateService struct {
	repo template_repository.TemplateRepository
}

func (s *templateService) GetTemplate(name string) (string, error) {
	if s.repo != nil {
		tmpl, err := s.repo.GetByName(name)
		if err == nil && tmpl != nil && tmpl.Content != "" {
			return tmpl.Content, nil
		}
	}

	if defaultTmpl, exists := defaultTemplates[name]; exists {
		return defaultTmpl, nil
	}

	return "", fmt.Errorf("template '%s' not found", name)
}

func (s *templateService) Render(templateName string, variables map[string]interface{}) (string, error) {
	tmplContent, err := s.GetTemplate(templateName)
	if err != nil {
		return "", err
	}

	return s.RenderCustom(tmplContent, variables), nil
}

func (s *templateService) RenderCustom(templateContent string, variables map[string]interface{}) string {
	result := templateContent
	for k, v := range variables {
		placeholder := fmt.Sprintf("{{%s}}", k)
		valStr := fmt.Sprintf("%v", v)
		result = strings.ReplaceAll(result, placeholder, valStr)
	}
	return result
}

func (s *templateService) SeedDefaultTemplates() error {
	if s.repo == nil {
		return nil
	}

	for name, content := range defaultTemplates {
		existing, err := s.repo.GetByName(name)
		if err == nil && existing != nil {
			continue
		}
		_ = s.repo.CreateOrUpdate(&template_model.MessageTemplate{
			Name:     name,
			Content:  content,
			IsActive: true,
		})
	}
	return nil
}

func NewTemplateService(repo template_repository.TemplateRepository) TemplateService {
	return &templateService{repo: repo}
}
