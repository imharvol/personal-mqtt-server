require('dotenv').config()

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const aedes = require('aedes')

// Constants
const port = process.env.PORT ?? 8883
const pkFile = process.env.PK ?? 'pk.pem'
const certFile = process.env.CERT ?? 'cert.pem'

assert((process.env.USERNAMES ?? '').split(',').length === (process.env.PASSWORDS ?? '').split(',').length)
const users = (process.env.USERNAMES ?? '').split(',').map((e, i) => {
  return {
    username: e,
    password: (process.env.PASSWORDS ?? '').split(',')[i]
  }
})

// Setup aedes MQTT server
const aedesServer = aedes()
const server = require('tls').createServer({
  key: fs.readFileSync(path.join(__dirname, pkFile)),
  cert: fs.readFileSync(path.join(__dirname, certFile))
}, aedesServer.handle)

// Setup aedes handlers
aedesServer.authenticate = function (client, username, password, callback) {
  console.log(username.toString())
  console.log(password.toString())

  const user = users.find(user => user.username === username.toString())
  if (!(user ?? false)) return callback(null, false)

  callback(null, user.password === password.toString())
}

// Connect plugins
const pluginsDir = path.join(__dirname, 'plugins')
fs.readdirSync(pluginsDir)
  .filter(plugin => plugin.endsWith('.js'))
  .map(plugin => path.join(pluginsDir, plugin))
  .forEach(plugin => {
    console.log('Loading Plugin: ', plugin)
    require(plugin)(aedesServer)
  })

// Start MQTT server
server.listen(port, () => {
  console.log('MQTT (TLS) listening on port ', port)
})
