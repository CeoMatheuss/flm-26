from fpdf import FPDF

class FLMPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, 'Guia de Competicoes Continentais - FLM', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Pagina {self.page_no()}', 0, 0, 'C')

def create_pdf():
    pdf = FLMPDF()
    pdf.add_page()
    
    # Introduction
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Como funciona o Sistema de Vagas?', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 7, (
        "O Football League Manager (FLM) possui um sistema de qualificacao meritocratico "
        "baseado no desempenho final de cada temporada nas ligas nacionais.\n\n"
        "1. Campeao (1o lugar): Garante vaga direta no MUNDIAL DE CLUBES.\n"
        "2. Do 2o ao 8o lugar: Garantem vaga na respectiva COMPETICAO CONTINENTAL.\n"
    ))
    pdf.ln(5)

    # Competitions Detail
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Competicoes por Continente', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    continents = {
        "Europa (UEFA Champions League)": [
            "Alemanha", "Austria", "Belgica", "Dinamarca", "Escocia", "Espanha", 
            "Franca", "Grecia", "Holanda", "Inglaterra", "Italia", "Noruega", 
            "Portugal", "Russia", "Suedia", "Suica", "Turquia", "Ucrania"
        ],
        "America do Sul (Copa Libertadores)": [
            "Argentina", "Brasil", "Chile", "Colombia", "Equador", "Paraguai", "Peru", "Uruguai"
        ],
        "America do Norte/Central (CONCACAF Champions Cup)": [
            "Estados Unidos", "Mexico"
        ],
        "Asia (AFC Champions League)": [
            "Arabia Saudita", "Coreia do Sul", "Japao"
        ],
        "Africa (CAF Champions League)": [
            "Egito"
        ]
    }

    for comp, countries in continents.items():
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 8, comp, 0, 1)
        pdf.set_font('Arial', '', 10)
        pdf.multi_cell(0, 6, "Paises: " + ", ".join(countries))
        pdf.ln(3)

    # Summary
    pdf.ln(5)
    pdf.set_font('Arial', 'I', 10)
    pdf.multi_cell(0, 6, "Nota: Todos os dados sao atualizados em tempo real conforme o encerramento das rodadas.")

    import os
    if not os.path.exists('public/docs'):
        os.makedirs('public/docs')
    
    pdf.output("public/docs/guia_continental.pdf")
    print("PDF gerado com sucesso em public/docs/guia_continental.pdf")

if __name__ == "__main__":
    create_pdf()
