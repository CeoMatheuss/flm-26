import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import cm

# Mock data based on the earlier read_query (truncated in tool output but I have the structure)
shop_items = [
    {
        "name": "Campanha Local",
        "category": "marketing",
        "description": "Aumente a presença do clube na cidade e conquiste novos torcedores locais.",
        "duration_days": 10,
        "bonus_data": {"torcidaPorDia": 500, "fans_max": 2000, "revenue_bonus": 0.05}
    },
    {
        "name": "Marketing Nacional",
        "category": "marketing",
        "description": "Leve o nome do clube para todo o país com campanhas de mídia esportiva.",
        "duration_days": 15,
        "bonus_data": {"torcidaPorDia": 10000, "fans_max": 20000, "revenue_bonus": 0.2}
    },
    {
        "name": "Plano Sócio Ouro",
        "category": "members",
        "description": "Um salto gigante para o clube. Milhares de novos sócios e uma explosão de engajamento da torcida.",
        "duration_days": 30,
        "bonus_data": {"initialFans": 5000, "initialMembers": 2000, "monthlyRevenue": 45000}
    },
    {
        "name": "NovaSports Master",
        "category": "sponsorship",
        "description": "Patrocinador máster inicial. Estampa o peito da camisa e injeta capital diário.",
        "duration_days": 30,
        "bonus_data": {"daily_cash": 10000, "dinheiroSemanal": 70000, "immediate_cash": 50000}
    },
    {
        "name": "Olheiros Mundiais Elite",
        "category": "scouting",
        "description": "A melhor rede de olheiros do mundo à sua disposição.",
        "duration_days": None,
        "bonus_data": {"quality": 1.6, "discover_promisses": True}
    }
]

def generate_pdf(filename):
    doc = SimpleDocTemplate(filename, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=24, spaceAfter=20, alignment=1, textColor=colors.HexColor("#10b981"))
    header_style = ParagraphStyle('HeaderStyle', parent=styles['Heading2'], fontSize=18, spaceBefore=15, spaceAfter=10, textColor=colors.HexColor("#3b82f6"))
    body_style = styles['BodyText']
    body_style.fontSize = 11
    body_style.leading = 14

    elements = []

    # Title
    elements.append(Paragraph("Manual do Sistema de Loja - FLM 26", title_style))
    elements.append(Paragraph("Guia detalhado sobre produtos, entregas e benefícios diários.", styles['Italic']))
    elements.append(Spacer(1, 1*cm))

    # Introduction
    elements.append(Paragraph("Como Funciona a Entrega", header_style))
    delivery_text = """
    O sistema de loja do Football Life Manager funciona de forma <b>sincronizada e inteligente</b>. 
    Diferente de sistemas comuns, o FLM processa entregas em dois momentos críticos:<br/><br/>
    1. <b>Entrega Imediata:</b> No momento da aprovação do pagamento, bônus fixos (como pacotes de torcedores iniciais ou entrada de caixa imediata) são creditados instantaneamente no banco de dados.<br/>
    2. <b>Entrega Diária (Offline & Online):</b> Produtos com benefícios recorrentes (Marketing, Sócios, Patrocínios) são processados a cada 24 horas. Se você ficar offline por vários dias, o sistema acumula esses bônus e os entrega integralmente assim que você faz login novamente.
    """
    elements.append(Paragraph(delivery_text, body_style))
    elements.append(Spacer(1, 0.5*cm))

    # Categories Breakdown
    elements.append(Paragraph("Categorias de Produtos", header_style))

    # 1. Marketing
    elements.append(Paragraph("<b>1. Marketing & Torcida</b>", styles['Heading3']))
    elements.append(Paragraph("Focado no crescimento da base de fãs e popularidade do clube.", body_style))
    data = [["Produto", "Duração", "Entrega Diária", "Efeito"]]
    for item in [i for i in shop_items if i['category'] == 'marketing']:
        gained = item['bonus_data'].get('torcidaPorDia', 0)
        data.append([item['name'], f"{item['duration_days']} dias", f"+{gained} torcedores", "Aumento de Receita"])
    
    t = Table(data, colWidths=[4*cm, 3*cm, 4*cm, 4*cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")), ('GRID', (0,0), (-1,-1), 0.5, colors.grey), ('FONTSIZE', (0,0), (-1,-1), 9)]))
    elements.append(t)
    elements.append(Spacer(1, 0.5*cm))

    # 2. Sócios
    elements.append(Paragraph("<b>2. Planos de Sócios-Torcedores</b>", styles['Heading3']))
    elements.append(Paragraph("Gera receita mensal fixa e bônus de venda de produtos.", body_style))
    data_socio = [["Plano", "Imediato", "Receita/Mês", "Bônus"]]
    for item in [i for i in shop_items if i['category'] == 'members']:
        initial = item['bonus_data'].get('initialMembers', 0)
        rev = item['bonus_data'].get('monthlyRevenue', 0)
        data_socio.append([item['name'], f"+{initial} sócios", f"R$ {rev:,}", "Vendas Loja"])
    
    t_socio = Table(data_socio, colWidths=[4*cm, 4*cm, 4*cm, 3*cm])
    t_socio.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#fef3c7")), ('GRID', (0,0), (-1,-1), 0.5, colors.grey), ('FONTSIZE', (0,0), (-1,-1), 9)]))
    elements.append(t_socio)
    elements.append(Spacer(1, 0.5*cm))

    # 3. Patrocínios
    elements.append(Paragraph("<b>3. Patrocínios Master</b>", styles['Heading3']))
    elements.append(Paragraph("Injeção pesada de capital diário e semanal.", body_style))
    data_spons = [["Sponsor", "Imediato", "Diário", "Semanal"]]
    for item in [i for i in shop_items if i['category'] == 'sponsorship']:
        imm = item['bonus_data'].get('immediate_cash', 0)
        daily = item['bonus_data'].get('daily_cash', 0)
        weekly = item['bonus_data'].get('dinheiroSemanal', 0)
        data_spons.append([item['name'], f"R$ {imm:,}", f"R$ {daily:,}", f"R$ {weekly:,}"])
    
    t_spons = Table(data_spons, colWidths=[4*cm, 4*cm, 3*cm, 4*cm])
    t_spons.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#dcfce7")), ('GRID', (0,0), (-1,-1), 0.5, colors.grey), ('FONTSIZE', (0,0), (-1,-1), 9)]))
    elements.append(t_spons)

    # Note on Offline
    elements.append(PageBreak())
    elements.append(Paragraph("Sincronização Offline", header_style))
    offline_text = """
    <b>O que acontece quando você não entra no jogo?</b><br/><br/>
    Diferente de outros jogos onde o tempo 'para', no FLM 26 o seu clube continua vivo. 
    Se você comprou uma <b>Campanha Nacional</b> de 15 dias e ficou 5 dias sem logar:<br/><br/>
    - Ao voltar, o sistema detecta a data do seu último acesso.<br/>
    - Ele calcula: <i>5 dias x 10.000 torcedores/dia = 50.000 torcedores</i>.<br/>
    - O lucro da <b>Loja Oficial</b> (venda de camisas e produtos) também é calculado dia a dia e depositado no caixa.<br/>
    - Você recebe uma notificação de <b>'Resumo de Ausência'</b> detalhando tudo o que o clube arrecadou enquanto você estava fora.
    """
    elements.append(Paragraph(offline_text, body_style))

    # Build PDF
    doc.build(elements)

if __name__ == "__main__":
    generate_pdf("/mnt/documents/Sistema_Loja_FLM26.pdf")
