import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS Middleware for Mobile (Capacitor/Android) & Desktop (.exe Electron) clients
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Initialize Gemini AI Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  };

  // Resilient content generator that tries primary model and falls back to alternate models on 503 / high demand
  const generateWithModelFallback = async (
    ai: GoogleGenAI,
    prompt: string,
    systemInstruction: string,
    responseSchema: any
  ) => {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema
          }
        });
        if (response.text) {
          return JSON.parse(response.text);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying fallback model... (${err?.message || err})`);
      }
    }
    throw lastError || new Error('All AI models failed');
  };

  // API Route: Class Plan Generator with Gemini AI
  app.post('/api/gemini/class-plan', async (req, res) => {
    const { teacherName, childrenAge, subject, objective, sectionName, duration } = req.body;
    const planDuration = duration || '1 Semana';

    try {
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback response if GEMINI_API_KEY is not present
        return res.json({
          objective: objective || `Desarrollar el aprendizaje cognitivo y creativo sobre "${subject}" para niños de ${childrenAge} (${planDuration}).`,
          development: `1. Diagnóstico e Inicio: Saludo en ronda, canciones interactivas y preguntas disparadoras sobre ${subject}.\n2. Desarrollo Práctico y Talleres: Actividades sensoriales paso a paso dirigidas por ${teacherName || 'el docente'}, manipulación de texturas y dibujo adaptado.\n3. Trabajo Colaborativo y Aplicación: Creación colectiva de murales o proyectos temáticos.`,
          closing: 'Evaluación formativa observacional mediante lista de cotejo cualitativa y asamblea infantil.',
          materials: 'Hojas de colores, pinturas biodegradables, tarjetas ilustradas y bloques de construcción.',
          duration: planDuration,
          weeklyBreakdown: `Módulo 1: Introducción y exploración sensorial de ${subject}.\nMódulo 2: Actividades prácticas en grupo.\nMódulo 3: Presentación de proyectos y evaluación.`
        });
      }

      const prompt = `Actúa como un Pedagogo Especialista en Educación Preescolar e Infantil. Genera una planificacion didáctica completa y DETALLADA (${planDuration}) para:
Maestro: ${teacherName || 'Docente'}
Rango de edad: ${childrenAge || '3 a 5 años'}
Materia/Tema: ${subject}
Duración / Extensión solicitada: ${planDuration}
Objetivo deseado: ${objective || 'Aprender jugando y explorando'}
Sección/Aula: ${sectionName || 'Preescolar'}

Por favor, genera una planificación extensa, rica en actividades paso a paso organizadas de manera lógica para abarcar la duración de ${planDuration}. Incluye un desglose semana a semana o día a día si aplica.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          objective: { type: Type.STRING, description: 'Objetivo claro y pedagógico del plan de clase' },
          development: { type: Type.STRING, description: 'Desarrollo extenso y detallado de las actividades paso a paso (Inicio, Desarrollo y Cierre por sesiones)' },
          closing: { type: Type.STRING, description: 'Estrategia de cierre, evaluación y evidencias' },
          materials: { type: Type.STRING, description: 'Lista exhaustiva de materiales necesarios' },
          duration: { type: Type.STRING, description: 'Duración del plan (ej. 1 Semana, 2 Semanas, 1 Mes)' },
          weeklyBreakdown: { type: Type.STRING, description: 'Desglose cronológico por semanas o fases según la duración' }
        },
        required: ['objective', 'development', 'closing', 'materials', 'duration', 'weeklyBreakdown']
      };

      const parsedData = await generateWithModelFallback(
        ai,
        prompt,
        'Eres un pedagogo experto en educación infantil. Devuelve la respuesta en formato JSON estructurado con las claves: objective, development, closing, materials, duration, weeklyBreakdown.',
        responseSchema
      );

      res.json(parsedData);
    } catch (err: any) {
      console.error('Error in /api/gemini/class-plan, providing pedagogic fallback:', err?.message || err);
      // Return HTTP 200 with structured fallback so the user UI never crashes
      res.json({
        objective: objective || `Desarrollo y comprensión de ${subject || 'contenidos de clase'} para ${childrenAge || 'preescolar'}.`,
        development: `1. Inicio y Motivación: Dinámica grupal de bienvenida y lluvia de ideas sobre ${subject || 'el tema'}.\n2. Actividades Centrales: Talleres motrices y creativos adaptados con participación activa.\n3. Cierre: Recapitulación en asamblea y muestra de trabajos.`,
        closing: 'Evaluación formativa a través de observación directa del docente.',
        materials: 'Material didáctico manipulativo, crayones, cartulina y fichas ilustradas.',
        duration: planDuration,
        weeklyBreakdown: `Fase 1: Indagación y motivación inicial.\nFase 2: Ejercicios de desarrollo y trabajo en equipo.\nFase 3: Cierre y retroalimentación.`
      });
    }
  });

  // API Route: Kitchen Menu Suggestion & Budget Calculator with Gemini AI
  app.post('/api/gemini/kitchen-menu', async (req, res) => {
    const { dayOfWeek, mealType, targetAgeRange, dietaryRestrictions, difficultyLevel, studentCount } = req.body;
    const count = Number(studentCount) || 35;
    const difficulty = difficultyLevel || 'Fácil / Rápido';

    try {
      const ai = getGeminiClient();

      if (!ai) {
        const costPerChild = 17.5;
        const total = Math.round(count * costPerChild);
        return res.json({
          dishName: `Platillo Saludable y Sencillo (${mealType})`,
          description: `Receta rápida de preparar para ${count} alumnos de preescolar, nutritiva y deliciosa.`,
          ingredients: [
            `Pechuga de pollo fresca (${(count * 0.12).toFixed(1)} kg)`,
            `Verduras variadas al vapor (${(count * 0.08).toFixed(1)} kg)`,
            `Arroz integral o puré de papas (${(count * 0.1).toFixed(1)} kg)`,
            `Fruta picada de estación (${(count * 0.1).toFixed(1)} kg)`
          ],
          allergensWarning: dietaryRestrictions || 'Revisar alergias individuales.',
          preparationSteps: [
            '1. Lavar y desinfectar cuidadosamente todos los ingredientes.',
            '2. Cocinar la proteína a temperatura adecuada con hierbas finas.',
            '3. Cocer las verduras al vapor para mantener nutrientes y sabor vibrante.',
            '4. Servir tibio en platos porcionados para preescolares.'
          ],
          difficultyLevel: difficulty,
          studentCount: count,
          costPerStudent: costPerChild,
          totalBudget: total,
          ingredientCosts: [
            { ingredient: 'Pechuga de Pollo', quantity: `${(count * 0.12).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.45) },
            { ingredient: 'Verduras al vapor', quantity: `${(count * 0.08).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.20) },
            { ingredient: 'Arroz / Papa', quantity: `${(count * 0.1).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.15) },
            { ingredient: 'Fruta fresca picada', quantity: `${(count * 0.1).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.20) }
          ]
        });
      }

      const prompt = `Actúa como Chef Escolar y Nutriólogo Infantil. Diseña un menú apetitoso y de PREPARACIÓN FÁCIL o sencillez seleccionada para un grupo de alumnos:
Día: ${dayOfWeek || 'Lunes'}
Tipo de Comida: ${mealType || 'Almuerzo'}
Nivel de Dificultad / Estilo: ${difficulty}
Cantidad de Alumnos (X): ${count} alumnos
Grupo de edad: ${targetAgeRange || '3 a 5 años'}
Restricciones/Alergias a considerar: ${dietaryRestrictions || 'Ninguna'}

Instrucciones Especiales:
1. Asegúrate de dar pasos claros y SENCILLOS de preparación (paso a paso) para el personal de cocina.
2. Calcula las cantidades exactas de ingredientes necesarias para alimentar a exactamente ${count} alumnos.
3. Proporciona un presupuesto estimado en Moneda Nacional (MXN o estándar) detallando el costo por alumno y el presupuesto total aproximado.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          dishName: { type: Type.STRING, description: 'Nombre claro y atractivo del platillo' },
          description: { type: Type.STRING, description: 'Descripción nutricional y apetitosa del menú' },
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Lista de ingredientes con cantidades escaladas para X alumnos'
          },
          preparationSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Pasos de preparación sencillos y ordenados para la cocinera'
          },
          allergensWarning: { type: Type.STRING, description: 'Aviso de alérgenos o recomendaciones' },
          difficultyLevel: { type: Type.STRING, description: 'Dificultad de preparación (ej. Fácil / Rápido)' },
          studentCount: { type: Type.NUMBER, description: 'Número total de alumnos calculados' },
          costPerStudent: { type: Type.NUMBER, description: 'Costo promedio por alumno en moneda local' },
          totalBudget: { type: Type.NUMBER, description: 'Presupuesto total estimado para la cantidad X de alumnos' },
          ingredientCosts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ingredient: { type: Type.STRING },
                quantity: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER }
              },
              required: ['ingredient', 'quantity', 'estimatedCost']
            },
            description: 'Desglose presupuestario de compras por ingrediente'
          }
        },
        required: ['dishName', 'description', 'ingredients', 'preparationSteps', 'allergensWarning', 'studentCount', 'costPerStudent', 'totalBudget']
      };

      const parsedData = await generateWithModelFallback(
        ai,
        prompt,
        'Devuelve la respuesta en formato JSON estructurado con: dishName, description, ingredients (array de cantidades ajustadas), preparationSteps (array de pasos de cocina), allergensWarning, difficultyLevel, studentCount, costPerStudent (number), totalBudget (number), e ingredientCosts (array de objetos con ingredient, quantity, estimatedCost).',
        responseSchema
      );

      res.json(parsedData);
    } catch (err: any) {
      console.error('Error in /api/gemini/kitchen-menu, providing nutrition fallback:', err?.message || err);
      const fallbackCostPerChild = 16;
      const totalBudget = count * fallbackCostPerChild;

      // Return HTTP 200 with structured fallback so the user UI never crashes
      res.json({
        dishName: `Platillo Nutritivo y Saludable (${mealType || 'Almuerzo'})`,
        description: `Menú balanceado y rico en nutrientes formulado para ${count} alumnos de preescolar.`,
        ingredients: [
          `Pechuga de pollo o proteína magra (${(count * 0.12).toFixed(1)} kg)`,
          `Verduras frescas al vapor - zanahorias y calabacitas (${(count * 0.08).toFixed(1)} kg)`,
          `Arroz blanco al vapor con elote (${(count * 0.1).toFixed(1)} kg)`,
          `Agua de frutas naturales de temporada (${(count * 0.2).toFixed(1)} L)`
        ],
        preparationSteps: [
          '1. Lavar, desinfectar y trocear las verduras en trozos pequeños aptos para preescolar.',
          '2. Cocer la proteína a fuego medio sazonando con hierbas naturales.',
          '3. Cocer las verduras al vapor para preservar sus nutrientes.',
          '4. Emplatar en porciones adecuadas y servir a temperatura agradable.'
        ],
        allergensWarning: dietaryRestrictions || 'Revisar antecedentes de alergias alimentarias.',
        difficultyLevel: difficulty,
        studentCount: count,
        costPerStudent: fallbackCostPerChild,
        totalBudget: totalBudget,
        ingredientCosts: [
          { ingredient: 'Proteína fresca', quantity: `${(count * 0.12).toFixed(1)} kg`, estimatedCost: Math.round(totalBudget * 0.45) },
          { ingredient: 'Verduras frescas', quantity: `${(count * 0.08).toFixed(1)} kg`, estimatedCost: Math.round(totalBudget * 0.20) },
          { ingredient: 'Guarnición de Arroz', quantity: `${(count * 0.1).toFixed(1)} kg`, estimatedCost: Math.round(totalBudget * 0.15) },
          { ingredient: 'Fruta para bebida', quantity: `${(count * 0.15).toFixed(1)} kg`, estimatedCost: Math.round(totalBudget * 0.20) }
        ]
      });
    }
  });

  // Local in-memory Mesh & Offline Event Relay Store
  interface MeshNode {
    nodeId: string;
    deviceName: string;
    role: string;
    roomCode: string;
    lastSeen: number;
    ip?: string;
  }

  interface MeshEvent {
    id: string;
    type: string;
    payload: any;
    senderId: string;
    senderName?: string;
    roomCode: string;
    timestamp: number;
  }

  const activeMeshNodes = new Map<string, MeshNode>();
  const meshEventBuffer: MeshEvent[] = [];
  let latestMeshSnapshot: { data: any; updatedAt: number; author: string } | null = null;

  // Cleanup stale nodes every 30 seconds
  setInterval(() => {
    const now = Date.now();
    for (const [nodeId, node] of activeMeshNodes.entries()) {
      if (now - node.lastSeen > 90000) { // 90 seconds timeout
        activeMeshNodes.delete(nodeId);
      }
    }
  }, 30000);

  // 1. Join / Heartbeat Local LAN Mesh
  app.post('/api/mesh/join', (req, res) => {
    const { nodeId, deviceName, role, roomCode } = req.body;
    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }

    const room = (roomCode || 'cde-bezaleel-mesh').trim().toLowerCase();
    const node: MeshNode = {
      nodeId,
      deviceName: deviceName || `Dispositivo-${nodeId.slice(-4)}`,
      role: role || 'docente',
      roomCode: room,
      lastSeen: Date.now(),
      ip: req.ip || req.socket.remoteAddress
    };

    activeMeshNodes.set(nodeId, node);

    // Return current peers in room
    const peers = Array.from(activeMeshNodes.values()).filter(n => n.roomCode === room && n.nodeId !== nodeId);
    res.json({
      success: true,
      roomCode: room,
      activePeersCount: peers.length,
      peers: peers.map(p => ({ nodeId: p.nodeId, deviceName: p.deviceName, role: p.role, lastSeen: p.lastSeen })),
      hasSnapshot: !!latestMeshSnapshot
    });
  });

  // 2. Get active local peers
  app.get('/api/mesh/peers', (req, res) => {
    const room = ((req.query.roomCode as string) || 'cde-bezaleel-mesh').trim().toLowerCase();
    const peers = Array.from(activeMeshNodes.values()).filter(n => n.roomCode === room);
    res.json({
      roomCode: room,
      count: peers.length,
      peers: peers.map(p => ({ nodeId: p.nodeId, deviceName: p.deviceName, role: p.role, lastSeen: p.lastSeen }))
    });
  });

  // 3. Post event to local mesh (Zero-Internet event relay)
  app.post('/api/mesh/events', (req, res) => {
    const { id, type, payload, senderId, senderName, roomCode } = req.body;
    if (!type || !senderId) {
      return res.status(400).json({ error: 'type and senderId are required' });
    }

    const room = (roomCode || 'cde-bezaleel-mesh').trim().toLowerCase();
    const event: MeshEvent = {
      id: id || `mesh-evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      senderId,
      senderName: senderName || 'Usuario Malla',
      roomCode: room,
      timestamp: Date.now()
    };

    // Keep buffer capped at 500 events
    meshEventBuffer.push(event);
    if (meshEventBuffer.length > 500) {
      meshEventBuffer.shift();
    }

    // Update node heartbeat
    const existing = activeMeshNodes.get(senderId);
    if (existing) {
      existing.lastSeen = Date.now();
      existing.roomCode = room;
    }

    res.json({ success: true, eventId: event.id, timestamp: event.timestamp });
  });

  // 4. Poll events from local mesh (since timestamp)
  app.get('/api/mesh/events', (req, res) => {
    const room = ((req.query.roomCode as string) || 'cde-bezaleel-mesh').trim().toLowerCase();
    const since = Number(req.query.since) || 0;
    const excludeSender = (req.query.excludeSender as string) || '';

    const newEvents = meshEventBuffer.filter(e => 
      e.roomCode === room && 
      e.timestamp > since && 
      (!excludeSender || e.senderId !== excludeSender)
    );

    res.json({
      roomCode: room,
      serverTime: Date.now(),
      eventsCount: newEvents.length,
      events: newEvents
    });
  });

  // 5. Store / Fetch full snapshot package for instant offline mesh sync
  app.post('/api/mesh/snapshot', (req, res) => {
    const { data, author } = req.body;
    if (data) {
      latestMeshSnapshot = {
        data,
        updatedAt: Date.now(),
        author: author || 'Malla Local'
      };
      res.json({ success: true, updatedAt: latestMeshSnapshot.updatedAt });
    } else {
      res.status(400).json({ error: 'data is required' });
    }
  });

  app.get('/api/mesh/snapshot', (req, res) => {
    if (!latestMeshSnapshot) {
      return res.json({ hasSnapshot: false });
    }
    res.json({
      hasSnapshot: true,
      updatedAt: latestMeshSnapshot.updatedAt,
      author: latestMeshSnapshot.author,
      data: latestMeshSnapshot.data
    });
  });

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'CDE BEZALEEL / Control Escolar',
      meshNodesActive: activeMeshNodes.size
    });
  });

  // Vite development middleware or production static build serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SchoolSync App running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
