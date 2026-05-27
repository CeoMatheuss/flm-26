
/**
 * Professional Verification Email Template for FLM
 * Theme: Football Manager / EA FC Style
 */
export const getVerificationEmailTemplate = (params: {
  userName: string;
  verificationCode: string;
  expirationMinutes: number;
  clubName?: string;
  creationDate?: string;
  ipAddress?: string;
  appUrl?: string;
}) => {
  const { 
    userName, 
    verificationCode, 
    verificationCode, 
    expirationMinutes, 
    clubName = 'Seu Clube', 
    creationDate = new Date().toLocaleString('pt-BR'),
    ipAddress = 'Indisponível',
    appUrl = 'https://footballlifemanager26.vercel.app'
  } = params;

  // Banner image: Stadium background with manager/players feel
  const bannerUrl = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200';
  const logoUrl = 'https://raw.githubusercontent.com/stackblitz/stackblitz-icons/main/icons/bolt.svg'; // Placeholder for logo

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verificação de Conta - Football Life Manager</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #050507;
      font-family: 'Inter', Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #050507;
      padding: 40px 0;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0a0a0c;
      border-radius: 24px;
      border: 1px solid #1f1f23;
      overflow: hidden;
      box-shadow: 0 30px 60px rgba(0,0,0,0.8);
    }

    /* Header & Banner */
    .header-banner {
      background: linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 1)), url('${bannerUrl}');
      background-size: cover;
      background-position: center;
      padding: 60px 40px;
      text-align: center;
      border-bottom: 2px solid #1f1f23;
    }

    .logo-container {
      display: inline-block;
      padding: 15px 25px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid rgba(0, 242, 255, 0.3);
      margin-bottom: 30px;
    }

    .logo-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #ffffff;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 4px;
    }

    .logo-main {
      font-family: 'Orbitron', sans-serif;
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      text-transform: uppercase;
      margin: 0;
    }

    .logo-main span {
      color: #00f2ff;
    }

    /* Content Area */
    .content {
      padding: 40px;
      text-align: center;
    }

    .welcome-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 22px;
      font-weight: 900;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    .user-greeting {
      font-size: 18px;
      color: #00f2ff;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .main-description {
      font-size: 15px;
      color: #8a8a90;
      line-height: 1.6;
      margin-bottom: 35px;
    }

    /* Verification Code Box */
    .code-box {
      background: #0f0f13;
      border: 2px solid #1f1f23;
      border-radius: 20px;
      padding: 40px 20px;
      margin: 30px 0;
      position: relative;
    }

    .code-box-header {
      font-size: 12px;
      color: #00f2ff;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 20px;
    }

    .verification-code {
      font-family: 'Orbitron', sans-serif;
      font-size: 56px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 12px;
      margin: 0;
      text-shadow: 0 0 20px rgba(0, 242, 255, 0.4);
    }

    .expiration-tag {
      display: inline-block;
      margin-top: 20px;
      font-size: 11px;
      color: #ff4d4d;
      background: rgba(255, 77, 77, 0.1);
      padding: 4px 12px;
      border-radius: 100px;
      font-weight: 700;
      text-transform: uppercase;
    }

    /* Action Button */
    .button-container {
      margin: 40px 0;
    }

    .btn {
      display: inline-block;
      padding: 18px 40px;
      background: linear-gradient(135deg, #00f2ff, #7b1fa2);
      color: #ffffff;
      text-decoration: none;
      font-family: 'Orbitron', sans-serif;
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      border-radius: 12px;
      letter-spacing: 1px;
      box-shadow: 0 10px 20px rgba(0, 242, 255, 0.2);
    }

    /* Game Info Table */
    .info-section {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 16px;
      padding: 20px;
      margin-top: 40px;
      text-align: left;
    }

    .info-row {
      margin-bottom: 12px;
      font-size: 13px;
    }

    .info-label {
      color: #505058;
      font-weight: 700;
      text-transform: uppercase;
      width: 100px;
      display: inline-block;
    }

    .info-value {
      color: #ffffff;
    }

    /* Motivation Quote */
    .motivation {
      font-style: italic;
      color: #00f2ff;
      font-size: 14px;
      margin: 40px 0;
      border-left: 3px solid #00f2ff;
      padding-left: 20px;
      text-align: left;
    }

    /* Footer */
    .footer {
      padding: 40px;
      text-align: center;
      background: #050507;
      border-top: 1px solid #1a1a20;
    }

    .footer-text {
      font-size: 11px;
      color: #404045;
      line-height: 1.8;
      margin-bottom: 20px;
    }

    .copyright {
      font-size: 10px;
      color: #2a2a2f;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    @media screen and (max-width: 600px) {
      .container {
        border-radius: 0;
      }
      .content {
        padding: 30px 20px;
      }
      .verification-code {
        font-size: 42px;
        letter-spacing: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header-banner">
        <a href="${appUrl}" style="text-decoration: none;">
          <div class="logo-container">
            <div class="logo-text">FOOTBALL</div>
            <div class="logo-main">LIFE <span>MANAGER</span></div>
          </div>
        </a>
        <div class="welcome-text">Pronto para a Temporada?</div>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="user-greeting">Olá, ${userName}!</div>
        <p class="main-description">
          Sua conta no FLM está quase pronta. Para garantir a segurança do seu elenco e o acesso exclusivo ao seu painel tático, confirme sua identidade com o código abaixo.
        </p>

        <!-- Code Box -->
        <div class="code-box">
          <div class="code-box-header">Código de Acesso Tático</div>
          <p class="verification-code">${verificationCode}</p>
          <div class="expiration-tag">Expira em ${expirationMinutes} minutos</div>
        </div>

        <p class="main-description" style="margin-top: 20px; font-size: 13px;">
          Insira este código na tela de verificação do jogo para desbloquear seu acesso.
        </p>

        <!-- Motivation -->
        <div class="motivation">
          "O futebol não é apenas sobre vencer, é sobre a jornada, a tática e a paixão em cada minuto do jogo."
        </div>

        <!-- System Info -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Clube:</span>
            <span class="info-value">${clubName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data:</span>
            <span class="info-value">${creationDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Origem:</span>
            <span class="info-value">${ipAddress}</span>
          </div>
        </div>

        <div class="footer-text" style="margin-top: 40px; font-size: 12px; color: #505058;">
          Se você não solicitou este código, ignore este e-mail. Alguém pode ter digitado seu endereço por engano. Sua conta permanece segura.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-text">
          Você está recebendo este e-mail porque se cadastrou no Football Life Manager 2026.<br>
          Este é um e-mail automático, por favor não responda.
        </div>
        <div class="copyright">
          © 2026 FOOTBALL LIFE MANAGER. TODOS OS DIREITOS RESERVADOS.<br>
          BRASIL | ACESSO ANTECIPADO
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
