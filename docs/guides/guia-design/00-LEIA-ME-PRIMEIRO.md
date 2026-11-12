# Guia de design - Quitou

> **Objetivo**: Este guia documenta os padrões, princípios e sistema de design da plataforma Quitou. Use como referência ao criar novas páginas, componentes ou refatorar designs existentes.

> **🤖 Para IAs**: Este arquivo funciona como um **router de documentação de design**. Use a seção "🎯 Guia de navegação para IAs" abaixo para encontrar rapidamente qual arquivo consultar baseado na tarefa de design que você precisa realizar.

> **⭐ IMPORTANTE**: Antes de consultar qualquer guia técnico, leia [00-VISAO-PLATAFORMA.md](00-VISAO-PLATAFORMA.md) para entender a identidade, personalidade e contexto da plataforma.

---

## 🎯 Guia de navegação para IAs

**Use esta seção para decidir qual arquivo do guia você precisa consultar baseado na tarefa de design:**

### 📋 Por tipo de tarefa

| Tarefa                           | Arquivo(s) a consultar                                                                                           | Prioridade  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- |
| **Entender a plataforma**        | [Visão](00-VISAO-PLATAFORMA.md)                                                                                  | **CRÍTICA** |
| **Criar página de checkout**     | [Visão](00-VISAO-PLATAFORMA.md) → [Estrutura](01-estrutura-layout.md) → [Cores](02-sistema-cores.md) | Alta        |
| **Criar página admin**           | [Visão](00-VISAO-PLATAFORMA.md) → [Estrutura](01-estrutura-layout.md) → [Estados](06-estados-feedback.md)     | Alta        |
| **Criar novo componente visual** | [Estrutura](01-estrutura-layout.md) → [Cores](02-sistema-cores.md)                                          | Alta        |
| **Aplicar cores e tokens**       | [Cores](02-sistema-cores.md)                                                                                     | Alta        |
| **Definir tipografia**           | [Tipografia](03-tipografia.md)                                                                                   | Alta        |
| **Estruturar layout**            | [Estrutura](01-estrutura-layout.md) → [Espaçamento](04-espacamento-composicao.md)                                | Alta        |
| **Garantir responsividade**      | [Responsividade](05-responsividade-breakpoints.md)                                                               | Alta        |
| **Implementar estados/feedback** | [Estados](06-estados-feedback.md) → [Estrutura](01-estrutura-layout.md)                                       | Alta        |
| **Criar formulários**            | [Estrutura](01-estrutura-layout.md) → [Estados](06-estados-feedback.md)                                       | Alta        |

### 🔍 Por contexto de trabalho

#### **"Preciso entender que tipo de plataforma estamos criando"**

1. Leia [00-VISAO-PLATAFORMA.md](00-VISAO-PLATAFORMA.md) - Identidade e personalidade

#### **"Preciso criar uma página de checkout"**

1. [00-VISAO-PLATAFORMA.md](00-VISAO-PLATAFORMA.md) - Confirme que é contexto Público
2. [01-estrutura-layout.md](01-estrutura-layout.md) - Estrutura de seções
3. [02-sistema-cores.md](02-sistema-cores.md) - Cores e tokens

#### **"Preciso criar uma página admin/dashboard"**

1. [00-VISAO-PLATAFORMA.md](00-VISAO-PLATAFORMA.md) - Confirme que é contexto Aplicação
2. [01-estrutura-layout.md](01-estrutura-layout.md) - Layouts e estrutura
3. [06-estados-feedback.md](06-estados-feedback.md) - Loading, erros, sucesso
4. [02-sistema-cores.md](02-sistema-cores.md) - Cores funcionais

---

## 🎨 Princípios fundamentais de design

### 1. Design limpo e funcional

A plataforma Quitou busca clareza e funcionalidade. Priorizamos:

- **Simplicidade**: Elementos essenciais, sem decoração desnecessária
- **Hierarquia clara**: Informação facilmente escaneável
- **Consistência**: Padrões claros em toda a aplicação
- **Performance**: Design que não compromete velocidade

### 2. Sistema de cores semântico

Cores não são apenas decorativas, carregam significado:

- **Cores primárias** para ações principais
- **Cores semânticas** (verde, vermelho, amarelo) para feedback
- **Cores neutras** para backgrounds e textos

### 3. Mobile-first e responsivo

Todo design começa no mobile e escala para desktop:

- **Breakpoints consistentes**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Conteúdo adaptável**: Layouts que se reorganizam
- **Touch-friendly**: Áreas de toque adequadas (mínimo 44x44px)
- **Performance**: Imagens otimizadas, lazy loading

### 4. Acessibilidade como prioridade

Design bonito não significa inacessível:

- **Contraste adequado**: WCAG AA mínimo
- **Navegação por teclado**: Todos os elementos interativos acessíveis
- **ARIA labels**: Quando necessário
- **Textos alternativos**: Sempre para imagens

---

## ✅ Checklist ao criar novo design

- [ ] Segue os princípios fundamentais?
- [ ] Usa sistema de cores do shadcn/ui?
- [ ] Tipografia consistente?
- [ ] Espaçamento adequado?
- [ ] Responsivo (mobile-first)?
- [ ] Contraste adequado (WCAG AA)?
- [ ] Usa tokens de cor do sistema?
- [ ] Textos centralizados em `CONTENT`?

---

## 📚 Estrutura completa do guia

### 🌟 Fundamentos (leia primeiro)

1. [Visão da plataforma](00-VISAO-PLATAFORMA.md) - Identidade e personalidade

### 🎨 Design Técnico

2. [Estrutura e layout](01-estrutura-layout.md) - Seções e organização
3. [Sistema de cores](02-sistema-cores.md) - Paleta e tokens (shadcn/ui)
4. [Tipografia](03-tipografia.md) - Hierarquia textual
5. [Espaçamento e composição](04-espacamento-composicao.md) - Respiração visual
6. [Responsividade e breakpoints](05-responsividade-breakpoints.md) - Mobile-first
7. [Estados e feedback](06-estados-feedback.md) - Loading, erros, notificações

---

## 🔄 Atualizações

Este guia é um documento vivo. Quando você:

- Descobrir um novo padrão visual
- Criar um componente reutilizável
- Identificar uma melhoria de UX
- Resolver um problema de design comum

**Documente aqui!** Isso ajuda toda a equipe a manter consistência.

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
