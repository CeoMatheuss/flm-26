
import { execSync } from 'child_process';

const assetsDir = '/mnt/documents/trailer_assets';
const output = '/mnt/documents/FLM_Trailer_Cinematic_Gameplay.mp4';

const scenes = [
  { img: 'landing.png', text: 'ISSO NÃO É SÓ UM JOGO DE FUTEBOL...', dur: 5 },
  { img: 'dashboard.png', text: 'É CONTROLE TOTAL. NO FLM, VOCÊ COMANDA.', dur: 10 },
  { img: 'tactics.png', text: 'ESCALAÇÃO, TÁTICA, TUDO IMPORTA.', dur: 10 },
  { img: 'scouts.png', text: 'OLHEIROS EM BUSCA DO PRÓXIMO CRAQUE.', dur: 10 },
  { img: 'dashboard.png', text: 'DOMINE A LIGA. CONQUISTE A COPA.', dur: 10 },
  { img: 'landing.png', text: 'OU SEJA ESQUECIDO.', dur: 10 },
  { img: 'landing.png', text: 'EM BREVE NO SEU NAVEGADOR', dur: 5 },
];

let filter = '';
let inputs = '';

scenes.forEach((s, i) => {
  inputs += ` -loop 1 -t ${s.dur} -i ${assetsDir}/${s.img}`;
});

// Build the filter complex
// We want to scale each input to 1920x1080 and then concatenate
scenes.forEach((s, i) => {
  const start = scenes.slice(0, i).reduce((acc, curr) => acc + curr.dur, 0);
  const end = start + s.dur;
  
  // Zoompan effect: zoom in slowly
  filter += `[${i}:v]scale=1920:1080,zoompan=z='min(zoom+0.001,1.5)':d=125:s=1920x1080,`;
  
  // Add text
  // We'll use a simple drawtext if available, or just leave it for now if fonts are tricky.
  // Actually, I'll try to use drawtext with a common font path.
  filter += `drawtext=text='${s.text}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h-200:shadowcolor=black:shadowx=2:shadowy=2[v${i}];`;
});

const concat = scenes.map((_, i) => `[v${i}]`).join('') + `concat=n=${scenes.length}:v=1:a=0[v]`;

const cmd = `ffmpeg -y ${inputs} -i ${assetsDir}/music.mp3 -filter_complex "${filter}${concat}" -map "[v]" -map ${scenes.length}:a -c:v libx264 -pix_fmt yuv420p -t 60 ${output}`;

console.log('Running ffmpeg...');
try {
  execSync(cmd);
  console.log('Video generated at', output);
} catch (e) {
  console.error('Error generating video:', e.message);
}
