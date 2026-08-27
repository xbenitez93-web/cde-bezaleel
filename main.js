const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'CDE Bezaleel - Control Escolar',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'), // Opcional: ruta a tu icono
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // En producción, carga el index.html de la carpeta dist/ producida por "npm run build"
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    console.error('Error cargando dist/index.html:', err);
    // Si no ha ejecutado el build aún, muestra un aviso instructivo
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:3rem; text-align:center;">
        <h2 style="color:#f59e0b;">dist/index.html no encontrado</h2>
        <p>Primero debes compilar la aplicación ejecutando en tu terminal:</p>
        <code style="background:#1e293b; padding:0.5rem 1rem; border-radius:6px; color:#38bdf8; font-size:1.1rem;">npm run build</code>
      </body>
    `));
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
