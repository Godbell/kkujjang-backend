import { configDotenv } from 'dotenv'
import express from 'express'
import expressWs from 'express-ws'
import https from 'https'
import asyncify from 'express-asyncify'
import cookieParser from 'cookie-parser'
import { testRouter } from '@router/test'
import { userRouter } from '@router/user'
import { noticeRouter } from '@router/notice'
import { reportRouter } from '@router/report'
import { inquiryRouter } from '@router/inquiry'
import { getMessageResult } from '@socket/kkujjang'

configDotenv()

const server = asyncify(express())
expressWs(server) // 웹소켓 기능 추가

server.ws('/websocket', (ws, req) => {
  ws.on('connection', (stream) => {
    console.log(`Connected to Client ${stream}`)
  })

  ws.on('close', () => {
    console.log(`Connection closed.`)
  })

  ws.on('message', (message) => {
    const result = getMessageResult(JSON.parse(message), req.cookies?.sessionId)

    ws.send(JSON.stringify(result))
  })
})

const sslOptions =
  process.env.NODE_ENV === 'production'
    ? {
        key: fs.readFileSync(process.env.SSL_KEY_LOCATION),
        cert: fs.readFileSync(process.env.SSL_CRT_LOCATION),
        ca: fs.readFileSync(process.env.SSL_CA_LOCATION),
      }
    : null

server.use(express.json())
server.use(cookieParser())

server.use('/test', testRouter)
server.use('/user', userRouter)
server.use('/notice', noticeRouter)
server.use('/report', reportRouter)
server.use('/inquiry', inquiryRouter)

server.use(async (err, req, res, next) => {
  const { statusCode = 500, message = 'undefined error', messages = [] } = err

  // message만 값 존재 -> message
  // messages만 값 존재 -> undefined error: {messages}
  // 둘 모두 값 존재 -> {message}: error1, error2, ...
  const errorMessage = `${message}${
    messages.length > 0 ? `: ${messages.join(', ')}` : ''
  }`

  const result = {
    error: errorMessage,
  }

  err.stack && console.log(err.stack)

  res.status(statusCode).json(result)
})

if (sslOptions) {
  https.createServer(sslOptions, server).listen(process.env.HTTPS_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTPS_PORT}`)
  })
} else {
  server.listen(process.env.HTTP_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTP_PORT}`)
  })
}
