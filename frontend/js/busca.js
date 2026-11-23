// busca.js — Logica da Home: filtros (RF1), debounce (RNF2), render de cards e skeleton

const POR_PAGINA = 6
let cacheBusca = new Map()
let listaCompleta = []
let paginaAtual = 0
let buscaIniciada = false

document.addEventListener('DOMContentLoaded', iniciarPaginaBusca)

document.addEventListener('idioma:alterado', function () {
  preencherOpcoesSelects()
  if (!buscaIniciada) return
  paginaAtual = 0
  renderizarResultados(listaCompleta)
})

function iniciarPaginaBusca() {
  montarNavbar('home')
  preencherSelects()
  vincularEventos()
  executarBusca()
  sincronizarComAPI()
}

function preencherSelects() {
  const selectEstado = document.getElementById('filtroEstado')
  preencherOpcoesSelects()

  selectEstado.addEventListener('change', function () {
    preencherOpcoesCidades()
  })
}

function preencherOpcoesSelects() {
  const selectEstado = document.getElementById('filtroEstado')
  const selectCidade = document.getElementById('filtroCidade')
  const estadoAtual = selectEstado.value
  const cidadeAtual = selectCidade.value

  selectEstado.innerHTML = '<option value="">' + escapeHTML(t('filtros.todasUfs')) + '</option>' +
    listarEstadosDemo().map(function (estado) {
      return '<option value="' + escapeHTML(estado) + '">' + escapeHTML(estado) + '</option>'
    }).join('')
  selectEstado.value = estadoAtual

  preencherOpcoesCidades(cidadeAtual)
}

function preencherOpcoesCidades(cidadeAtual) {
  const selectEstado = document.getElementById('filtroEstado')
  const selectCidade = document.getElementById('filtroCidade')
  const valorAtual = cidadeAtual !== undefined ? cidadeAtual : selectCidade.value
  selectCidade.innerHTML = '<option value="">' + escapeHTML(t('filtros.todasCidades')) + '</option>' +
    listarCidadesDemo(selectEstado.value).map(function (cidade) {
      return '<option value="' + escapeHTML(cidade) + '">' + escapeHTML(cidade) + '</option>'
    }).join('')
  selectCidade.value = valorAtual
}

function vincularEventos() {
  const formBusca = document.getElementById('formBusca')
  const inputNome = document.getElementById('filtroNome')
  const btnCarregarMais = document.getElementById('btnCarregarMais')

  formBusca.addEventListener('submit', function (evento) {
    evento.preventDefault()
    executarBusca()
  })

  inputNome.addEventListener('input', debounce(executarBusca, 300))

  if (btnCarregarMais) {
    btnCarregarMais.addEventListener('click', function () {
      const area = document.getElementById('areaResultados')
      const proximos = listaCompleta.slice(paginaAtual, paginaAtual + POR_PAGINA)
      area.insertAdjacentHTML('beforeend', proximos.map(function (curso) { return cardResultado(curso) }).join(''))
      paginaAtual += POR_PAGINA
      atualizarBotaoCarregarMais()
    })
  }
}

function obterFiltros() {
  return {
    nome: document.getElementById('filtroNome').value.trim(),
    estado: document.getElementById('filtroEstado').value,
    cidade: document.getElementById('filtroCidade').value
  }
}

async function buscarCursos(filtros) {
  const chaveCache = JSON.stringify(filtros)
  if (cacheBusca.has(chaveCache)) return cacheBusca.get(chaveCache)

  const params = new URLSearchParams(filtros)
  let cursos
  try {
    const resultado = await api('GET', '/busca?' + params.toString())
    cursos = (resultado.dados && resultado.dados.cursos) || []
  } catch (e) {
    cursos = buscarCursosDemo(filtros)
  }
  cacheBusca.set(chaveCache, cursos)
  return cursos
}

async function executarBusca() {
  const area = document.getElementById('areaResultados')
  const resumo = document.getElementById('resumoResultados')
  const filtros = obterFiltros()

  buscaIniciada = true
  paginaAtual = 0
  cacheBusca.clear()
  area.innerHTML = skeleton(3)
  resumo.textContent = t('resultados.buscando')

  try {
    listaCompleta = await buscarCursos(filtros)
    renderizarResultados(listaCompleta)
  } catch (erro) {
    area.innerHTML = estadoErro(erro.message || t('resultados.erro'))
    resumo.textContent = ''
    atualizarBotaoCarregarMais()
  }
}

function renderizarResultados(cursos) {
  const area = document.getElementById('areaResultados')
  const resumo = document.getElementById('resumoResultados')

  if (cursos.length === 0) {
    area.innerHTML = estadoVazio(t('resultados.vazio'))
    resumo.textContent = ''
  } else {
    resumo.textContent = tp('resultados.resumo', cursos.length)
    const iniciais = cursos.slice(paginaAtual, paginaAtual + POR_PAGINA)
    area.innerHTML = iniciais.map(function (curso) { return cardResultado(curso) }).join('')
    paginaAtual += iniciais.length
  }
  atualizarBotaoCarregarMais()
}

function atualizarBotaoCarregarMais() {
  const areaCarregarMais = document.getElementById('areaCarregarMais')
  if (!areaCarregarMais) return
  const temMais = paginaAtual < listaCompleta.length
  areaCarregarMais.classList.toggle('hidden', !temMais)
}
