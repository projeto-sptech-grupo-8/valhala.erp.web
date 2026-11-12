# Valhalla ERP

O **Valhalla ERP** é uma interface web de gestão empresarial desenvolvida para centralizar as principais rotinas de um estabelecimento. O projeto reúne controle de estoque, vendas, pedidos, financeiro, relatórios e configurações de segurança em um painel responsivo e de fácil utilização.

> O frontend combina telas demonstrativas com integração à API para os fluxos já conectados. Algumas telas e dados continuam sendo simulados no navegador.

## Funcionalidades

- Site institucional com apresentação da solução e de seus recursos;
- Fluxos de login e recuperação de acesso com validação de formulário;
- Dashboard com indicadores, movimentações e alertas de estoque;
- Cadastro e consulta de produtos, categorias e fornecedores;
- Controle de movimentações, locais de estocagem e inventário;
- Telas de caixa, pedidos, orçamentos e notas fiscais;
- Visão financeira e relatórios gerenciais;
- Administração de usuários e permissões;
- Configuração demonstrativa de autenticação em dois fatores (2FA);
- Preferências de notificações, aparência e dados do estabelecimento;
- Layout responsivo para diferentes tamanhos de tela.

## Tecnologias utilizadas

- [React 19](https://react.dev/)
- [React Router DOM 7](https://reactrouter.com/)
- [Vite 8](https://vite.dev/)
- JavaScript com JSX
- CSS Modules
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)

## Pré-requisitos

Antes de iniciar, instale:

- [Node.js](https://nodejs.org/) em uma versão compatível com o Vite 8;
- npm, incluído na instalação do Node.js.

## Instalação e execução

Clone o repositório e acesse a pasta da aplicação:

```bash
git clone <URL_DO_REPOSITORIO>
cd valhala.erp.web/Valhalla
```

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

O terminal exibirá o endereço local da aplicação, normalmente `http://localhost:5173`.

## Comandos disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com atualização automática |
| `npm run build` | Gera a versão otimizada para produção na pasta `dist` |
| `npm run preview` | Executa localmente uma prévia da versão de produção |
| `npm run lint` | Analisa o código com o Oxlint |

## Estrutura do projeto

```text
Valhalla/
├── public/                 # Arquivos estáticos e identidade visual
├── src/
│   ├── app/                 # Inicialização, roteamento, providers e configuração global
│   ├── pages/               # Páginas de rota organizadas por domínio
│   ├── widgets/             # Blocos compostos, como menu lateral e cabeçalho
│   ├── features/            # Fluxos e ações do usuário por domínio
│   ├── entities/            # Modelos, regras e componentes de entidades de negócio
│   ├── shared/              # API base, UI genérica, hooks, utilitários e estilos globais
│   └── main.jsx             # Ponto de entrada do React
├── index.html
├── package.json
└── vite.config.js
```

## Estado atual

A navegação usa React Router com `HashRouter`, preservando URLs do painel no formato `#/produtos`. As telas privadas passam por uma proteção de sessão e mantêm as checagens de permissão existentes. A estrutura de pastas segue uma organização baseada em Feature-Sliced Design, com APIs públicas para as principais fatias. A integração com API e as simulações ainda variam por módulo; consulte [docs/ARQUITETURA_FSD.md](docs/ARQUITETURA_FSD.md) para os limites e pontos de evolução da arquitetura.

## Próximos passos sugeridos

- Integrar a aplicação a uma API;
- Implementar autenticação e controle de sessão;
- Persistir cadastros e movimentações em banco de dados;
- Adicionar testes automatizados;
- Configurar variáveis de ambiente e pipeline de implantação.

## Equipe

Projeto desenvolvido pelo **Grupo 08** como parte do Projeto Integrador.

## Licença

Este projeto tem finalidade acadêmica. Consulte a equipe responsável antes de reutilizar ou distribuir o código.
