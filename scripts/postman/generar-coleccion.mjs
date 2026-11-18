// Genera docs/pruebas-integrales/postman/coleccion.json, entorno.json y el PDF ficticio de la subida.
// Uso: node scripts/postman/generar-coleccion.mjs
// La colección NO se escribe a mano: se arma aquí. La carpeta 02 sale de docs/pruebas-matriz-acceso.csv.
// Sin contraseñas ni tokens: las credenciales llegan por variables de entorno (ver correr-newman.mjs).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '../..');
const SALIDA = resolve(RAIZ, 'docs/pruebas-integrales/postman');
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const TOKEN = {
  supervisor: '{{tokenSupervisor}}',
  asesor: '{{tokenAsesor1}}',
  asesor1: '{{tokenAsesor1}}',
  asesor2: '{{tokenAsesor2}}',
  auxiliar: '{{tokenAuxiliar}}',
};

// ---------- ayudantes ----------
const json = (o) => JSON.stringify(o);
const eventoPrueba = (lineas) => ({
  listen: 'test',
  script: { type: 'text/javascript', exec: lineas.flat() },
});
const eventoPrevio = (lineas) => ({
  listen: 'prerequest',
  script: { type: 'text/javascript', exec: lineas.flat() },
});
const estado = (codigo) => [
  `pm.test('estado ${Array.isArray(codigo) ? codigo.join(' o ') : codigo}', () => pm.expect(pm.response.code).to.be.oneOf([${[codigo].flat().join(', ')}]));`,
];
// Solo agenda y avisos cuentan como requerimiento de tiempo (RNF-01, menos de 5 s). El resto se mide
// y queda en el reporte de Newman y en tiempos.csv, sin aserción.
const tiempoRnf = () => [
  `pm.test('tiempo menor a 5 s (RNF-01)', () => pm.expect(pm.response.responseTime).to.be.below(5000));`,
];
const cuerpoJson = () => [`const cuerpo = pm.response.json();`];
const guardar = (variable, expresion) => [
  `pm.collectionVariables.set('${variable}', ${expresion});`,
];

function peticion(nombre, o) {
  const { m = 'GET', ruta, rol, body, formdata, pre, pruebas = [], headers = [] } = o;
  const [path, consulta] = ruta.split('?');
  const url = {
    raw: `{{baseUrl}}${ruta}`,
    host: ['{{baseUrl}}'],
    path: path.split('/').filter(Boolean),
  };
  if (consulta) {
    url.query = consulta.split('&').map((par) => {
      const [key, value] = par.split('=');
      return { key, value };
    });
  }
  const request = {
    method: m,
    header: [
      ...(rol ? [{ key: 'Authorization', value: `Bearer ${TOKEN[rol]}` }] : []),
      ...(body !== undefined ? [{ key: 'Content-Type', value: 'application/json' }] : []),
      ...headers,
    ],
    url,
  };
  // Los ids de catálogo son enteros: sin comillas, Postman los sustituye como número.
  if (body !== undefined) {
    request.body = {
      mode: 'raw',
      raw: json(body).replace(/"\{\{(regimenId|leyId|aforeId)\}\}"/g, '{{$1}}'),
    };
  }
  if (formdata) request.body = { mode: 'formdata', formdata };
  const event = [];
  if (pre) event.push(eventoPrevio(pre));
  event.push(eventoPrueba(pruebas));
  return { name: nombre, request, event };
}
const carpeta = (name, item) => ({ name, item });

// ---------- 00 Salud ----------
const salud = carpeta('00 Salud', [
  peticion('GET /health sin token', {
    ruta: '/health',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [`pm.test('status ok', () => pm.expect(cuerpo.status).to.eql('ok'));`],
    ],
  }),
]);

// ---------- 01 Acceso ----------
const login = (rol, clave) =>
  peticion(`POST /auth/login (${rol})`, {
    m: 'POST',
    ruta: '/auth/login',
    body: { correo_electronico: `{{${clave}Correo}}`, contrasena: `{{${clave}Contrasena}}` },
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('trae access_token', () => pm.expect(cuerpo.access_token).to.be.a('string').and.not.empty);`,
        `pm.test('trae el usuario con su id', () => pm.expect(cuerpo.usuario.id).to.be.a('string'));`,
      ],
      guardar(`token${clave[0].toUpperCase()}${clave.slice(1)}`, 'cuerpo.access_token'),
      guardar(`id${clave[0].toUpperCase()}${clave.slice(1)}`, 'cuerpo.usuario.id'),
    ],
  });
const acceso = carpeta('01 Acceso', [
  login('Supervisor', 'supervisor'),
  login('Asesor 1', 'asesor1'),
  login('Asesor 2', 'asesor2'),
  login('Auxiliar', 'auxiliar'),
  peticion('POST /auth/login con contraseña incorrecta', {
    m: 'POST',
    ruta: '/auth/login',
    body: { correo_electronico: '{{supervisorCorreo}}', contrasena: 'incorrecta-ficticia' },
    pruebas: [estado(401)],
  }),
  peticion('POST /auth/login sin cuerpo', {
    m: 'POST',
    ruta: '/auth/login',
    pruebas: [estado(400)],
  }),
  peticion('GET /clientes sin token', { ruta: '/clientes', pruebas: [estado(401)] }),
  peticion('GET /clientes con token inválido', {
    ruta: '/clientes',
    headers: [{ key: 'Authorization', value: 'Bearer token.invalido.ficticio' }],
    pruebas: [estado(401)],
  }),
]);

// ---------- 02 Matriz de acceso ----------
// Regla (decidida por Isaac): esperado 403 -> debe dar 403; "supera los guards" -> código distinto de 401
// y 403; pública -> sin token, distinto de 401 y 403. El código obtenido de cada fila queda en el reporte
// de Newman y en matriz-resultados.csv (lo escribe correr-newman.mjs).
const filas = readFileSync(resolve(RAIZ, 'docs/pruebas-matriz-acceso.csv'), 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(','));
const matriz = carpeta(
  '02 Matriz de acceso',
  filas.map(([ruta, metodo, rol, esperado]) => {
    const real = ruta.replace(/\/api\/v1/, '').replace(/:[A-Za-z]+/g, UUID_INEXISTENTE);
    const publica = esperado === 'pública';
    const pruebas = [];
    if (esperado === '403') pruebas.push(estado(403));
    else {
      pruebas.push([
        `pm.test('${publica ? 'pública: sin token, ' : 'supera los guards: '}distinto de 401 y 403', () => pm.expect(pm.response.code).to.not.be.oneOf([401, 403]));`,
      ]);
    }
    return peticion(`[${rol}] ${metodo} ${ruta.replace('/api/v1', '')} | esperado: ${esperado}`, {
      m: metodo,
      ruta: real,
      rol: publica ? undefined : rol,
      body: ['POST', 'PUT', 'PATCH'].includes(metodo) ? {} : undefined,
      pruebas,
    });
  }),
);

// ---------- 03 Clientes y etapas ----------
const cuerpoCliente = {
  nombre: 'Cliente',
  apellido_paterno: 'Integral',
  apellido_materno: 'Ficticio',
  referido_por: 'pruebas-integrales',
  telefono: '9990000000',
  fecha_ingreso: '2026-11-01',
  correo_electronico: 'cliente.integral@ejemplo.test',
  fecha_nacimiento: '1970-05-17',
  estado_civil: 'casado',
  dependientes_economicos: 2,
  regimen_id: '{{regimenId}}',
  ley_probable_id: '{{leyId}}',
  semanas_imss_reconocidas: 500,
  tiene_issste: 'no',
  afore_id: '{{aforeId}}',
  observaciones_generales: 'Dato ficticio de prueba.',
  requiere_contadora: 'no',
  sexo: 'hombre',
  domicilio: 'Calle Ficticia 1',
  estado: 'Quintana Roo',
  subdelegacion_imss_probable: 'Subdelegación ficticia',
  cambio_afore: 'no',
  objetivo_cliente: 'pensionarse_asap',
};
const etapa = (paso) => `{{etapa${paso}Id}}`;
const catalogo = (nombre, ruta, variable) =>
  peticion(`GET /catalogos/${ruta}`, {
    ruta: `/catalogos/${ruta}`,
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('catálogo con datos', () => pm.expect(cuerpo).to.be.an('array').that.is.not.empty);`,
      ],
      guardar(variable, 'cuerpo[0].id'),
    ],
  });
const cambiarEstatus = (nombre, cuerpo, codigo, extra = []) =>
  peticion(nombre, {
    m: 'PATCH',
    ruta: `/clientes/{{clienteId}}/etapas/${etapa(3)}`,
    rol: 'asesor1',
    body: cuerpo,
    pruebas: [estado(codigo), cuerpoJson(), extra],
  });
const clientes = carpeta('03 Clientes y etapas', [
  catalogo('regímenes', 'regimenes', 'regimenId'),
  catalogo('leyes', 'leyes-probables', 'leyId'),
  catalogo('afores', 'afores', 'aforeId'),
  peticion('GET /clientes del Asesor 1 (cartera cargada por el ETL)', {
    ruta: '/clientes',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [`pm.test('trae clientes del ETL', () => pm.expect(cuerpo.length).to.be.above(0));`],
      guardar('clienteExistenteId', 'cuerpo[0].id'),
    ],
  }),
  peticion('GET /usuarios (Supervisor): ids de Asesor 2 y Auxiliar', {
    ruta: '/usuarios',
    rol: 'supervisor',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `const por = (c) => cuerpo.find((u) => u.correo_electronico.toLowerCase() === (c || '').toLowerCase());`,
        `pm.test('encuentra Asesor 2 y Auxiliar', () => { pm.expect(por(pm.variables.get('asesor2Correo'))).to.be.an('object'); pm.expect(por(pm.variables.get('auxiliarCorreo'))).to.be.an('object'); });`,
        `pm.collectionVariables.set('asesor2Id', por(pm.variables.get('asesor2Correo')).id);`,
        `pm.collectionVariables.set('auxiliarId', por(pm.variables.get('auxiliarCorreo')).id);`,
      ],
    ],
  }),
  peticion('POST /clientes (Asesor 1) crea el cliente con sus 16 etapas', {
    m: 'POST',
    ruta: '/clientes',
    rol: 'asesor1',
    body: cuerpoCliente,
    pruebas: [
      estado(201),
      cuerpoJson(),
      [
        `pm.test('asesor_id es el del token', () => pm.expect(cuerpo.asesor_id).to.eql(pm.collectionVariables.get('idAsesor1')));`,
      ],
      guardar('clienteId', 'cuerpo.id'),
    ],
  }),
  peticion('GET /clientes/:id/etapas trae las 16 etapas (0 a 15)', {
    ruta: '/clientes/{{clienteId}}/etapas',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('16 etapas', () => pm.expect(cuerpo.etapas).to.have.lengthOf(16));`,
        `pm.test('pasos 0 a 15 sin repetir', () => pm.expect(cuerpo.etapas.map((e) => e.numero_paso).sort((a, b) => a - b)).to.eql([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]));`,
        `pm.test('todas inician Por iniciar (estatus 2) con avance 10', () => cuerpo.etapas.forEach((e) => { pm.expect(e.estatus_id).to.eql(2); pm.expect(e.avance_porcentaje).to.eql(10); }));`,
        `cuerpo.etapas.forEach((e) => pm.collectionVariables.set('etapa' + e.numero_paso + 'Id', e.id));`,
      ],
    ],
  }),
  peticion('GET /clientes/:id del Asesor 2 (no es suyo)', {
    ruta: '/clientes/{{clienteId}}',
    rol: 'asesor2',
    pruebas: [estado([403, 404])],
  }),
  cambiarEstatus('PATCH etapa a Bloqueado sin motivo', { estatus_id: 7 }, 400, [
    `pm.test('pide motivo_rechazo', () => pm.expect(JSON.stringify(cuerpo.message)).to.include('motivo_rechazo'));`,
  ]),
  cambiarEstatus(
    'PATCH etapa a Bloqueado con motivo',
    { estatus_id: 7, motivo_rechazo: 'Falta documento ficticio' },
    200,
    [
      `pm.test('queda Bloqueado con su motivo', () => { pm.expect(cuerpo.estatus_id).to.eql(7); pm.expect(cuerpo.motivo_rechazo).to.eql('Falta documento ficticio'); });`,
    ],
  ),
  cambiarEstatus(
    'PATCH En proceso cliente con avance 10 (fuera de 20 a 90)',
    { estatus_id: 3, avance_porcentaje: 10 },
    400,
  ),
  cambiarEstatus(
    'PATCH En proceso cliente con avance 95 (fuera de 20 a 90)',
    { estatus_id: 3, avance_porcentaje: 95 },
    400,
  ),
  cambiarEstatus(
    'PATCH En proceso cliente con avance 50',
    { estatus_id: 3, avance_porcentaje: 50 },
    200,
    [
      `pm.test('estatus 3 y avance 50', () => { pm.expect(cuerpo.estatus_id).to.eql(3); pm.expect(cuerpo.avance_porcentaje).to.eql(50); });`,
    ],
  ),
  peticion('GET historial de la etapa: bitácora con los dos cambios', {
    ruta: `/clientes/{{clienteId}}/etapas/${etapa(3)}/historial`,
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('dos filas: Por iniciar a Bloqueado y Bloqueado a En proceso cliente', () => {`,
        `  const pares = cuerpo.map((h) => h.estatus_anterior_id + '>' + h.estatus_nuevo_id).sort();`,
        `  pm.expect(pares).to.eql(['2>7', '7>3']);`,
        `});`,
        `pm.test('registra quién cambió', () => cuerpo.forEach((h) => pm.expect(h.cambiado_por).to.eql(pm.collectionVariables.get('idAsesor1'))));`,
      ],
    ],
  }),
  peticion('GET etapa tras el cambio: estatus y avance coinciden con la bitácora', {
    ruta: '/clientes/{{clienteId}}/etapas',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `const e3 = cuerpo.etapas.find((e) => e.numero_paso === 3);`,
        `pm.test('etapa 3 en estatus 3 con avance 50', () => { pm.expect(e3.estatus_id).to.eql(3); pm.expect(e3.avance_porcentaje).to.eql(50); });`,
      ],
    ],
  }),
  peticion('PATCH /clientes/:id/asesor: el Supervisor reasigna al Asesor 2', {
    m: 'PATCH',
    ruta: '/clientes/{{clienteId}}/asesor',
    rol: 'supervisor',
    body: { asesor_id: '{{asesor2Id}}' },
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('asesor_id nuevo', () => pm.expect(cuerpo.asesor_id).to.eql(pm.collectionVariables.get('asesor2Id')));`,
      ],
    ],
  }),
  peticion('GET cliente reasignado: el Asesor 2 ya lo ve', {
    ruta: '/clientes/{{clienteId}}',
    rol: 'asesor2',
    pruebas: [estado(200)],
  }),
  peticion('GET cliente reasignado: el Asesor 1 ya no lo ve', {
    ruta: '/clientes/{{clienteId}}',
    rol: 'asesor1',
    pruebas: [estado([403, 404])],
  }),
  peticion('PATCH asesor: el Asesor 2 no puede reasignar (403)', {
    m: 'PATCH',
    ruta: '/clientes/{{clienteId}}/asesor',
    rol: 'asesor2',
    body: { asesor_id: '{{idAsesor1}}' },
    pruebas: [estado(403)],
  }),
  peticion('PATCH /clientes/:id/asesor: el Supervisor lo devuelve al Asesor 1', {
    m: 'PATCH',
    ruta: '/clientes/{{clienteId}}/asesor',
    rol: 'supervisor',
    body: { asesor_id: '{{idAsesor1}}' },
    pruebas: [estado(200)],
  }),
]);

// ---------- 04 Documentos ----------
const documentos = carpeta('04 Documentos', [
  peticion('GET documentos de un cliente ajeno: el Auxiliar sin autorización', {
    ruta: '/clientes/{{clienteExistenteId}}/documentos',
    rol: 'auxiliar',
    pruebas: [estado([403, 404])],
  }),
  peticion('POST documento PDF ficticio (Asesor 1)', {
    m: 'POST',
    ruta: '/clientes/{{clienteId}}/documentos',
    rol: 'asesor1',
    formdata: [
      { key: 'tipo_documento_id', value: '1', type: 'text' },
      { key: 'archivo', type: 'file', src: 'archivos/documento-ficticio.pdf' },
    ],
    pruebas: [
      estado(201),
      cuerpoJson(),
      [
        `pm.test('queda por confirmar y es PDF', () => { pm.expect(cuerpo.estatus).to.eql('por_confirmar'); pm.expect(cuerpo.mime_type).to.eql('application/pdf'); });`,
      ],
      guardar('documentoId', 'cuerpo.id'),
    ],
  }),
  peticion('GET documentos del cliente: aparece el subido', {
    ruta: '/clientes/{{clienteId}}/documentos',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('incluye el documento', () => pm.expect(cuerpo.map((d) => d.id)).to.include(pm.collectionVariables.get('documentoId')));`,
      ],
    ],
  }),
  peticion('POST /clientes/:id/auxiliares: el Asesor 1 autoriza al Auxiliar', {
    m: 'POST',
    ruta: '/clientes/{{clienteId}}/auxiliares',
    rol: 'asesor1',
    body: { auxiliar_id: '{{auxiliarId}}' },
    pruebas: [estado(201)],
  }),
  peticion('GET documentos: el Auxiliar autorizado ya los ve', {
    ruta: '/clientes/{{clienteId}}/documentos',
    rol: 'auxiliar',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('ve el documento', () => pm.expect(cuerpo.map((d) => d.id)).to.include(pm.collectionVariables.get('documentoId')));`,
      ],
    ],
  }),
  peticion('PATCH documento: el Auxiliar lo revisa (estatus si)', {
    m: 'PATCH',
    ruta: '/clientes/{{clienteId}}/documentos/{{documentoId}}',
    rol: 'auxiliar',
    body: { estatus: 'si', observaciones: 'Revisado en pruebas integrales' },
    pruebas: [
      estado(200),
      cuerpoJson(),
      [`pm.test('estatus si', () => pm.expect(cuerpo.estatus).to.eql('si'));`],
    ],
  }),
  peticion('GET descargar documento: es un PDF', {
    ruta: '/clientes/{{clienteId}}/documentos/{{documentoId}}/descargar',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      [
        `pm.test('content-type pdf', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf'));`,
        `pm.test('empieza con %PDF-', () => pm.expect(pm.response.text().slice(0, 5)).to.eql('%PDF-'));`,
      ],
    ],
  }),
  peticion('GET descargar documento sin token', {
    ruta: '/clientes/{{clienteId}}/documentos/{{documentoId}}/descargar',
    pruebas: [estado(401)],
  }),
]);

// ---------- 05 F0 ----------
const pdf = (nombre, ruta, rol, codigo) =>
  peticion(nombre, {
    ruta,
    rol,
    pruebas:
      codigo === 200
        ? [
            estado(200),
            [
              `pm.test('content-type pdf', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf'));`,
              `pm.test('empieza con %PDF-', () => pm.expect(pm.response.text().slice(0, 5)).to.eql('%PDF-'));`,
            ],
          ]
        : [estado(codigo)],
  });
const f0 = carpeta('05 F0', [
  pdf(
    'GET F0 en PDF (Asesor 1)',
    '/clientes/{{clienteId}}/diagnostico-inicial/pdf',
    'asesor1',
    200,
  ),
  pdf(
    'GET F0 en PDF (Auxiliar autorizado)',
    '/clientes/{{clienteId}}/diagnostico-inicial/pdf',
    'auxiliar',
    200,
  ),
  pdf(
    'GET F0 en PDF (Auxiliar, cliente no autorizado)',
    '/clientes/{{clienteExistenteId}}/diagnostico-inicial/pdf',
    'auxiliar',
    [403, 404],
  ),
  pdf('GET F0 en PDF sin token', '/clientes/{{clienteId}}/diagnostico-inicial/pdf', undefined, 401),
]);

// ---------- 06 F1 por pasos ----------
const dx = '/clientes/{{clienteId}}/diagnostico';
const etapa1 = (nombre, pruebas) =>
  peticion(nombre, {
    ruta: '/clientes/{{clienteId}}/etapas',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [`const e1 = cuerpo.etapas.find((e) => e.numero_paso === 1);`],
      pruebas,
    ],
  });
const paso = (nombre, m, sub, body, codigo = 200) =>
  peticion(nombre, { m, ruta: `${dx}${sub}`, rol: 'asesor1', body, pruebas: [estado(codigo)] });
const f1 = carpeta('06 F1 por pasos', [
  pdf('GET F1 en PDF sin diagnóstico creado: 409', `${dx}/pdf`, 'asesor1', 409),
  paso('POST diagnóstico vacío', 'POST', '', {}, 201),
  etapa1('GET etapa 1 sigue Por iniciar con un diagnóstico vacío', [
    `pm.test('estatus 2 (Por iniciar)', () => pm.expect(e1.estatus_id).to.eql(2));`,
  ]),
  paso('PUT objetivos (primera sección completa)', 'PUT', '/objetivos', {
    items: [{ objetivo_id: 1 }],
  }),
  etapa1('GET etapa 1: En proceso asesor con avance 25', [
    `pm.test('estatus 4 (En proceso asesor)', () => pm.expect(e1.estatus_id).to.eql(4));`,
    `pm.test('avance 25', () => pm.expect(e1.avance_porcentaje).to.eql(25));`,
  ]),
  peticion('GET F1 en PDF con faltantes: 409 y la lista de lo que falta', {
    ruta: `${dx}/pdf`,
    rol: 'asesor1',
    pruebas: [
      estado(409),
      cuerpoJson(),
      [
        `pm.test('dice que está incompleto', () => pm.expect(cuerpo.message).to.match(/incompleto/));`,
        `pm.test('lista los faltantes con sección y campo', () => { pm.expect(cuerpo.faltantes).to.be.an('array').that.is.not.empty; pm.expect(cuerpo.faltantes[0]).to.have.keys('seccion', 'campo', 'etiqueta'); });`,
      ],
    ],
  }),
  paso('PATCH diagnóstico: campos obligatorios del formato', 'PATCH', '', {
    fecha_primera_cotizacion: '1995-03-01',
    cotizo_antes_julio_1997: true,
    tipo_pension_probable: 'cesantia',
    edad_objetivo_pension: 60,
    comentarios_cliente: 'Quiere retirarse pronto',
    observaciones_regimen: 'Régimen Ley 73 probable',
    fecha_ultima_baja: '2024-01-15',
    ultimo_salario_cotizado: 450.5,
    fecha_vencimiento_conservacion: '2029-01-15',
    tiene_conservacion_derechos: 'si',
    tiempo_estimado_conservacion_meses: 50,
    dentro_de_conservacion: 'si',
    requiere_reactivacion: false,
    conviene_pensionar_ahora: 'depende_escenario',
    comentarios_conservacion: 'Comentario de conservación ficticio',
    semanas_reconocidas_al_baja: 1000,
    semanas_descontadas: 20,
    semanas_reintegradas: 10,
    semanas_efectivas_pension: 990,
    semanas_requeridas_pension: 1250,
    trabaja_cuenta_propia: 'parcialmente',
    actividad_economica: 'Comercio ficticio',
    ingreso_mensual_aproximado: 9000,
    conclusion_modalidad_10: 'temporal',
    comentarios_modalidad_10: 'Comentario M10 ficticio',
    dado_de_baja_regimen_obligatorio: 'si',
    conclusion_modalidad_40: 'aplica',
    salario_propuesto_m40: 1500,
    meses_propuestos_m40: 24,
    evalua_retroactivo_m40: true,
    comentarios_modalidad_40: 'Comentario M40 ficticio',
    justificacion_estrategia: 'Justificación ficticia de la estrategia',
    siguiente_paso_sugerido: 'Siguiente paso ficticio',
    conclusion_financiera: 'Conclusión financiera ficticia',
  }),
  paso('PUT objetivos (con objetivo propio)', 'PUT', '/objetivos', {
    items: [{ objetivo_id: 1 }, { objetivo_id: 12, detalle_otro: 'Objetivo propio ficticio' }],
  }),
  paso('PUT documentos', 'PUT', '/documentos', {
    items: [
      { tipo_documento_id: 1, recibido: true, observaciones: 'Constancia vigente' },
      { tipo_documento_id: 2, recibido: false },
    ],
  }),
  paso('PUT inconsistencias-generales', 'PUT', '/inconsistencias-generales', {
    items: [{ tipo_id: 1 }],
  }),
  paso('PUT recuperacion-semanas', 'PUT', '/recuperacion-semanas', {
    aplica: 'si',
    observaciones: 'Observación de recuperación ficticia',
  }),
  paso('PUT recuperacion-gestiones', 'PUT', '/recuperacion-gestiones', {
    items: [{ tipo_gestion_id: 1 }],
  }),
  paso('PUT recuperacion-evidencias', 'PUT', '/recuperacion-evidencias', {
    items: [{ tipo_evidencia_id: 1 }],
  }),
  paso('PUT objetivos-modalidad-10', 'PUT', '/objetivos-modalidad-10', {
    items: [{ objetivo_id: 1 }],
  }),
  paso('PUT criterios-modalidad-10', 'PUT', '/criterios-modalidad-10', {
    items: [{ criterio: 'Tiene actividad independiente real', cumple: true }],
  }),
  paso('PUT objetivos-modalidad-40', 'PUT', '/objetivos-modalidad-40', {
    items: [{ objetivo_id: 1 }],
  }),
  paso('PUT criterios-modalidad-40', 'PUT', '/criterios-modalidad-40', {
    items: [{ criterio: 'Cuenta con baja del régimen obligatorio', cumplimiento: 'cumple' }],
  }),
  paso('PUT modalidad-40-retroactivo', 'PUT', '/modalidad-40-retroactivo', {
    meses_retroactivos_estimados: 6,
    total_estimado_pagar: 54321.5,
    dentro_de_plazo_reingreso: 'si',
    conclusion_retroactivo: 'conviene',
    comentarios: 'Comentario retroactivo ficticio',
  }),
  paso('PUT conveniencia-retroactivo', 'PUT', '/conveniencia-retroactivo', {
    items: [{ pregunta: '¿El retroactivo mejora salario promedio?', respuesta: true }],
  }),
  paso(
    'POST escenario de pensión',
    'POST',
    '/escenarios',
    {
      nombre_escenario: 'Escenario Base Ficticio',
      orden: 1,
      semanas_proyectadas: 1000,
      salario_promedio_proyectado: 450,
      inversion_total_estimada: 120000,
      pension_mensual_estimada: 9000,
      incremento_mensual: 1500,
      meses_recuperacion_inversion: 80,
    },
    201,
  ),
  paso('PUT situacion-patrimonial', 'PUT', '/situacion-patrimonial', {
    saldo_cuenta_individual: 250000,
    aportaciones_voluntarias: 0,
    ahorros_inversiones_adicionales: 10000,
    bienes_patrimoniales: 'Casa ficticia',
    creditos_deudas_vigentes: 'Ninguno',
    ingreso_mensual: 18000,
    otras_fuentes_ingreso: 'Renta ficticia',
    ingreso_conyuge: 12000,
    seguros: 'GMM ficticio',
    estado_salud: 'bueno',
    padecimientos: 'Ninguno',
    estado_civil: 'casado',
    edad_conyuge: 57,
    actividad_economica_conyuge: 'Docente',
  }),
  paso('PUT situacion-patrimonial/hijos', 'PUT', '/situacion-patrimonial/hijos', {
    items: [{ edad: 30 }, { edad: 25, tiene_discapacidad: true }],
  }),
  paso('PUT estrategias-recomendadas', 'PUT', '/estrategias-recomendadas', {
    items: [{ estrategia_id: 4 }],
  }),
  paso(
    'POST plan-accion',
    'POST',
    '/plan-accion',
    { accion: 'Acción del plan ficticia', fecha_objetivo: '2026-12-15' },
    201,
  ),
  peticion('POST periodo con inconsistencia', {
    m: 'POST',
    ruta: '/clientes/{{clienteId}}/periodos-inconsistencias',
    rol: 'asesor1',
    body: {
      nombre_patron: 'Patrón Periodo Ficticio',
      periodo_reclamado: '2018-2019',
      semanas_esperadas: 52,
      evidencia_disponible: 'Recibos',
      accion_sugerida: 'Aclarar',
    },
    pruebas: [estado(201)],
  }),
  etapa1('GET etapa 1 con el F1 completo: avance entre 25 y 90', [
    `pm.test('estatus 4 (En proceso asesor)', () => pm.expect(e1.estatus_id).to.eql(4));`,
    `pm.test('avance de 25 a 90 y mayor que 25', () => { pm.expect(e1.avance_porcentaje).to.be.within(26, 90); });`,
  ]),
  peticion('GET F1 en PDF completo: 200', {
    ruta: `${dx}/pdf`,
    rol: 'asesor1',
    pruebas: [
      estado(200),
      [
        `pm.test('content-type pdf', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf'));`,
        `pm.test('nombre de archivo del F1', () => pm.expect(pm.response.headers.get('Content-Disposition')).to.match(/Diagnostico-especializado-F1-/));`,
        `pm.test('empieza con %PDF-', () => pm.expect(pm.response.text().slice(0, 5)).to.eql('%PDF-'));`,
      ],
    ],
  }),
]);

// ---------- 07 Agenda y avisos ----------
// Cancún es UTC-5 todo el año (sin horario de verano); el sandbox de Postman no trae Intl.
const fechaMas2 = [
  `const local = new Date(Date.now() - 5 * 3600 * 1000 + 2 * 24 * 3600 * 1000);`,
  `pm.collectionVariables.set('fechaA2Dias', local.toISOString().slice(0, 10));`,
];
const agenda = carpeta('07 Agenda y avisos', [
  peticion('GET /agenda del Asesor 1 con 1,000 eventos sembrados', {
    ruta: '/agenda',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('trae al menos 1,000 eventos', () => pm.expect(cuerpo.length).to.be.at.least(1000));`,
      ],
      tiempoRnf(),
    ],
  }),
  peticion('GET /avisos del Asesor 1 con 1,000 eventos sembrados', {
    ruta: '/avisos',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('trae al menos 1,000 avisos', () => pm.expect(cuerpo.length).to.be.at.least(1000));`,
      ],
      tiempoRnf(),
    ],
  }),
  peticion('POST /agenda: cita a dos días', {
    m: 'POST',
    ruta: '/agenda',
    rol: 'asesor1',
    pre: fechaMas2,
    body: {
      cliente_id: '{{clienteId}}',
      fecha: '{{fechaA2Dias}}',
      hora: '10:00',
      motivo: 'Cita integral ficticia',
      estatus: 'pendiente',
    },
    pruebas: [estado(201), cuerpoJson(), guardar('eventoId', 'cuerpo.id')],
  }),
  peticion('GET /avisos: la cita a dos días genera su aviso', {
    ruta: '/avisos',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `const aviso = cuerpo.find((a) => a.evento_id === pm.collectionVariables.get('eventoId'));`,
        `pm.test('existe el aviso de la cita y está pendiente', () => { pm.expect(aviso).to.be.an('object'); pm.expect(aviso.tipo).to.eql('cita'); pm.expect(aviso.atendido).to.eql(false); });`,
        `if (aviso) pm.collectionVariables.set('avisoId', aviso.id);`,
      ],
      tiempoRnf(),
    ],
  }),
  peticion('PATCH /avisos/:id/atender', {
    m: 'PATCH',
    ruta: '/avisos/{{avisoId}}/atender',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('atendido por el Asesor 1', () => { pm.expect(cuerpo.atendido).to.eql(true); pm.expect(cuerpo.atendido_por).to.eql(pm.collectionVariables.get('idAsesor1')); });`,
      ],
    ],
  }),
  peticion('GET /avisos/:id: ya está atendido', {
    ruta: '/avisos/{{avisoId}}',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [`pm.test('atendido', () => pm.expect(cuerpo.atendido).to.eql(true));`],
    ],
  }),
  peticion('PATCH etapa 5: compromiso a dos días', {
    m: 'PATCH',
    ruta: `/clientes/{{clienteId}}/etapas/${etapa(5)}`,
    rol: 'asesor1',
    pre: fechaMas2,
    body: {
      accion_a_realizar: 'Entregar constancia ficticia',
      fecha_compromiso: '{{fechaA2Dias}}',
    },
    pruebas: [estado(200)],
  }),
  peticion('GET /avisos: el compromiso de la etapa genera su aviso de trámite', {
    ruta: '/avisos',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `const aviso = cuerpo.find((a) => a.etapa_tramite_id === pm.collectionVariables.get('etapa5Id'));`,
        `pm.test('existe el aviso de trámite y está pendiente', () => { pm.expect(aviso).to.be.an('object'); pm.expect(aviso.tipo).to.eql('tramite'); pm.expect(aviso.atendido).to.eql(false); });`,
        `if (aviso) pm.collectionVariables.set('avisoTramiteId', aviso.id);`,
      ],
      tiempoRnf(),
    ],
  }),
  peticion('PATCH /avisos/:id/atender (trámite)', {
    m: 'PATCH',
    ruta: '/avisos/{{avisoTramiteId}}/atender',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [`pm.test('atendido', () => pm.expect(cuerpo.atendido).to.eql(true));`],
    ],
  }),
  peticion('GET /avisos sin token', { ruta: '/avisos', pruebas: [estado(401)] }),
]);

// ---------- 08 Reportes ----------
const reporte = (periodo) =>
  peticion(`GET /reportes?periodo=${periodo} (Supervisor)`, {
    ruta: `/reportes?periodo=${periodo}`,
    rol: 'supervisor',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('periodo ${periodo} y alcance supervisor', () => { pm.expect(cuerpo.periodo).to.eql('${periodo}'); pm.expect(cuerpo.alcance).to.eql('supervisor'); });`,
        `pm.test('trae rango de fechas y cartera por etapa', () => { pm.expect(cuerpo.desde).to.match(/^\\d{4}-\\d{2}-\\d{2}$/); pm.expect(cuerpo.cartera.etapas).to.be.an('array').that.is.not.empty; });`,
      ],
    ],
  });
const reportes = carpeta('08 Reportes', [
  reporte('semanal'),
  reporte('mensual'),
  reporte('trimestral'),
  pdf(
    'GET /reportes/pdf?periodo=mensual (Supervisor)',
    '/reportes/pdf?periodo=mensual',
    'supervisor',
    200,
  ),
  peticion('GET /reportes con periodo inválido', {
    ruta: '/reportes?periodo=anual',
    rol: 'supervisor',
    pruebas: [estado(400)],
  }),
  peticion('GET /reportes del Asesor 1: alcance asesor', {
    ruta: '/reportes?periodo=mensual',
    rol: 'asesor1',
    pruebas: [
      estado(200),
      cuerpoJson(),
      [`pm.test('alcance asesor', () => pm.expect(cuerpo.alcance).to.eql('asesor'));`],
    ],
  }),
  peticion('GET /reportes del Auxiliar: 403', {
    ruta: '/reportes?periodo=mensual',
    rol: 'auxiliar',
    pruebas: [estado(403)],
  }),
  peticion('GET /reportes sin token', {
    ruta: '/reportes?periodo=mensual',
    pruebas: [estado(401)],
  }),
]);

// ---------- 09 ETL ----------
const archivoEtl = [
  { key: 'archivo', type: 'file', src: 'archivos/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx' },
];
const conteo = (nombre, variable) =>
  peticion(nombre, {
    ruta: '/clientes',
    rol: 'supervisor',
    pruebas: [
      estado(200),
      cuerpoJson(),
      variable === 'antes'
        ? [`pm.collectionVariables.set('clientesAntesEtl', cuerpo.length);`]
        : [
            `pm.test('el número de clientes del Supervisor no cambió (' + cuerpo.length + ')', () => pm.expect(cuerpo.length).to.eql(Number(pm.collectionVariables.get('clientesAntesEtl'))));`,
          ],
    ],
  });
const etl = carpeta('09 ETL', [
  conteo('GET /clientes (Supervisor): conteo antes de importar', 'antes'),
  peticion('POST /etl/importaciones?simulacro=true', {
    m: 'POST',
    ruta: '/etl/importaciones?simulacro=true',
    rol: 'supervisor',
    formdata: archivoEtl,
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('es simulacro y no carga nada', () => { pm.expect(cuerpo.cabecera.simulacro).to.eql(true); pm.expect(cuerpo.totales.cargados).to.eql(0); });`,
        `pm.test('lee los 54 renglones y la conciliación cuadra', () => { pm.expect(cuerpo.totales.leidos).to.eql(54); pm.expect(cuerpo.conciliacion.ok).to.eql(true); });`,
      ],
    ],
  }),
  conteo('GET /clientes (Supervisor): el simulacro no cambió el conteo', 'despues'),
  peticion('POST /etl/importaciones?simulacro=false: segunda corrida real', {
    m: 'POST',
    ruta: '/etl/importaciones?simulacro=false',
    rol: 'supervisor',
    formdata: archivoEtl,
    pruebas: [
      estado(200),
      cuerpoJson(),
      [
        `pm.test('corrida real: 0 cargados, 54 rechazados, conciliación correcta', () => { pm.expect(cuerpo.cabecera.simulacro).to.eql(false); pm.expect(cuerpo.totales.cargados).to.eql(0); pm.expect(cuerpo.totales.rechazados).to.eql(54); pm.expect(cuerpo.conciliacion.ok).to.eql(true); });`,
        `pm.test('46 renglones se rechazan con motivo "ya existe" (los 44 cargados y los IDs 53 y 54)', () => { pm.expect(cuerpo.totales.yaExistian).to.eql(46); pm.expect(cuerpo.renglones.filter((r) => r.rechazos.some((m) => /ya existe/i.test(m)))).to.have.lengthOf(46); });`,
        `pm.test('el reporte no trae CURP ni NSS completos', () => pm.expect(pm.response.text()).to.not.match(/[A-Z]{4}\\d{6}[HM][A-Z]{5}[A-Z0-9]\\d/));`,
      ],
    ],
  }),
  conteo('GET /clientes (Supervisor): la segunda corrida no cambió el conteo', 'despues'),
  peticion('POST /etl/importaciones sin archivo', {
    m: 'POST',
    ruta: '/etl/importaciones?simulacro=true',
    rol: 'supervisor',
    pruebas: [estado(400)],
  }),
  peticion('POST /etl/importaciones?simulacro=quizas', {
    m: 'POST',
    ruta: '/etl/importaciones?simulacro=quizas',
    rol: 'supervisor',
    formdata: archivoEtl,
    pruebas: [estado(400)],
  }),
  peticion('POST /etl/importaciones como Asesor: 403', {
    m: 'POST',
    ruta: '/etl/importaciones?simulacro=true',
    rol: 'asesor1',
    formdata: archivoEtl,
    pruebas: [estado(403)],
  }),
  peticion('POST /etl/importaciones sin token: 401', {
    m: 'POST',
    ruta: '/etl/importaciones?simulacro=true',
    formdata: archivoEtl,
    pruebas: [estado(401)],
  }),
]);

// ---------- 10 Consultas clave ----------
// GET que usa el frontend a diario. Sirven también para medir tiempos (agenda y avisos cuentan para RNF-01).
const consulta = (nombre, ruta, rol, extra = [], rnf = false) =>
  peticion(nombre, {
    ruta,
    rol,
    pruebas: [estado(200), cuerpoJson(), extra, rnf ? tiempoRnf() : []],
  });
const consultas = carpeta('10 Consultas clave', [
  consulta('GET /dashboard (Asesor 1)', '/dashboard', 'asesor1'),
  consulta('GET /dashboard (Supervisor)', '/dashboard', 'supervisor'),
  consulta('GET /clientes (Asesor 1)', '/clientes', 'asesor1', [`pm.test('es una lista', () => pm.expect(cuerpo).to.be.an('array'));`]),
  consulta('GET /clientes (Supervisor)', '/clientes', 'supervisor', [`pm.test('es una lista', () => pm.expect(cuerpo).to.be.an('array'));`]),
  consulta('GET /clientes/:id (Asesor 1)', '/clientes/{{clienteExistenteId}}', 'asesor1', [`pm.test('es el cliente pedido', () => pm.expect(cuerpo.id).to.eql(pm.collectionVariables.get('clienteExistenteId')));`]),
  consulta('GET /clientes/:id/etapas (Asesor 1)', '/clientes/{{clienteExistenteId}}/etapas', 'asesor1', [`pm.test('16 etapas', () => pm.expect(cuerpo.etapas).to.have.lengthOf(16));`]),
  consulta('GET /agenda (Supervisor)', '/agenda', 'supervisor', [`pm.test('es una lista', () => pm.expect(cuerpo).to.be.an('array'));`], true),
  consulta('GET /avisos (Supervisor)', '/avisos', 'supervisor', [`pm.test('es una lista', () => pm.expect(cuerpo).to.be.an('array'));`], true),
  consulta('GET /correcciones (Asesor 1)', '/correcciones', 'asesor1'),
]);

// ---------- salida ----------
const coleccion = {
  info: {
    name: 'H3GA pruebas integrales (Actividad 6)',
    description:
      'Generada por scripts/postman/generar-coleccion.mjs. Solo datos ficticios, base h3ga_test.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [salud, acceso, matriz, clientes, documentos, f0, f1, agenda, reportes, etl, consultas],
};
const entorno = {
  name: 'H3GA local (h3ga_test)',
  values: [
    'baseUrl',
    'supervisorCorreo',
    'supervisorContrasena',
    'asesor1Correo',
    'asesor1Contrasena',
    'asesor2Correo',
    'asesor2Contrasena',
    'auxiliarCorreo',
    'auxiliarContrasena',
  ].map((key) => ({
    key,
    value: key === 'baseUrl' ? 'http://localhost:3001/api/v1' : '',
    enabled: true,
  })),
  _postman_variable_scope: 'environment',
};
mkdirSync(resolve(SALIDA, 'archivos'), { recursive: true });
writeFileSync(resolve(SALIDA, 'coleccion.json'), `${JSON.stringify(coleccion, null, 2)}\n`);
writeFileSync(resolve(SALIDA, 'entorno.json'), `${JSON.stringify(entorno, null, 2)}\n`);
// PDF mínimo y ficticio para la subida de documentos.
writeFileSync(
  resolve(SALIDA, 'archivos/documento-ficticio.pdf'),
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
);
copyFileSync(
  resolve(RAIZ, 'test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx'),
  resolve(SALIDA, 'archivos/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx'),
);
const total = coleccion.item.reduce((n, c) => n + c.item.length, 0);
console.log(`Colección generada: ${coleccion.item.length} carpetas, ${total} peticiones.`);
