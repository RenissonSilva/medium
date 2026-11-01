# Medium

Jogo de palavras para jogar em grupo, cada um no seu celular, direto do navegador — ninguém precisa instalar nada.

Uma palavra sai do baralho, alguém junta uma da própria mão, e todo mundo tenta falar **ao mesmo tempo** uma terceira palavra que ligue as duas. Quem falar a mesma palavra que outra pessoa ganha ponto.

## Como se joga

1. Alguém cria a sala e mostra o **QR code** (ou passa o código de 4 letras). Quem lê o QR code cai direto na sala.
2. O anfitrião escolhe quantas rodadas (5, 10, 15 ou 20) e aperta **Iniciar jogo**. Cada jogador recebe 5 palavras.
3. Uma palavra sai do baralho. Cada um pode escolher, da própria mão, uma palavra que combine com ela — vale a de quem confirmar primeiro, e a rodada começa na hora.
4. As duas palavras aparecem para todos. Cada um pensa numa palavra que ligue as duas e aperta **Estou pronto**.
5. Quando todo mundo está pronto, vem a contagem sincronizada: **3, 2, 1… FALEM!**
6. O anfitrião marca quem combinou — cada um ganha 1 ponto.
7. As duas palavras saem do jogo (não se repetem) e quem jogou recebe uma nova.

## Rodando no seu computador

Precisa do [Node.js](https://nodejs.org) 20.19 ou mais novo.

```bash
npm install
npm run dev
```

O terminal mostra dois endereços:

```
  Neste computador:  http://localhost:3000
  No celular (mesma Wi-Fi):  http://192.168.1.70:3000
```

Abra o primeiro no computador (ou o segundo no celular) e crie uma sala. O QR code já aponta para o endereço da rede local, então é só os outros celulares **na mesma Wi-Fi** lerem o QR code com a câmera.

> Em modo de desenvolvimento cada aba do navegador é um jogador diferente, então dá para testar com várias abas no mesmo computador. Na versão de produção a identidade fica salva no navegador (fechar e abrir a aba volta para o mesmo lugar); para testar vários jogadores num computador, use janelas anônimas ou navegadores diferentes.

## Colocando no ar

```bash
npm run build   # gera dist/client (site) e dist/server.js (servidor)
npm start       # roda em produção na porta 3000
```

Variáveis de ambiente (todas opcionais):

| Variável     | Para quê                                                                      | Padrão    |
| ------------ | ----------------------------------------------------------------------------- | --------- |
| `PORT`       | Porta do servidor                                                             | `3000`    |
| `HOST`       | Interface de rede                                                             | `0.0.0.0` |
| `PUBLIC_URL` | Endereço público usado no QR code (ex.: `https://medium.onrender.com`)        | o endereço que o anfitrião abriu |

Funciona em qualquer serviço que rode Node.js com WebSocket (Render, Railway, Fly.io, uma VPS…). No Render, por exemplo, crie um *Web Service* com:

- **Build command:** `npm install --include=dev && npm run build`
- **Start command:** `npm start`

Também há um `Dockerfile`:

```bash
docker build -t medium .
docker run -p 3000:3000 medium
```

**Importante:** as salas ficam na memória do servidor. Rode **uma instância só** (sem réplicas) e saiba que reiniciar o servidor encerra as salas abertas.

### Câmera dentro do jogo

O botão **Ler QR code** (na tela "Entrar numa sala") usa a câmera pelo navegador, o que só é permitido em endereço seguro (`https://`). No ar com HTTPS ele funciona; na rede local (`http://192.168.…`) o jogo avisa e é só usar a câmera normal do celular para ler o QR code — ela abre o link direto na sala.

## Estrutura

```
client/            site (React + Vite)
  src/screens/     uma tela para cada etapa: Início, Entrar, Sala, Escolha, Par,
                   Contagem, Acertos, Rodada, Fim
  src/components/  peças do visual (cartas, fichas, QR code, menu, leitor de câmera)
  src/state/       conexão com o servidor e reconexão automática
server/
  game.ts          regras do jogo (fonte da verdade de cada sala)
  rooms.ts         salas, conexões e reconexão
  words.ts         o baralho — edite aqui para mudar as palavras
shared/types.ts    tipos e constantes usados pelos dois lados
tests/             testes das regras e de uma partida pela rede
```

O servidor decide tudo; cada celular recebe só o que pode ver (a mão dos outros nunca sai do servidor). Se a tela bloquear ou a internet cair, o celular volta sozinho para o mesmo lugar na sala.

## Testes

```bash
npm test          # regras + partida com 3 jogadores pela rede
npm run typecheck
```
