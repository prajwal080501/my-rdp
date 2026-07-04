require('dotenv').config()
const app = require('./src/app')
const { connectDb } = require('./src/db')

const PORT = process.env.PORT || 4000

connectDb()
  .then(() => app.listen(PORT, () => console.log(`Control plane listening on port ${PORT}`)))
  .catch((err) => {
    console.error('Failed to start control plane:', err)
    process.exit(1)
  })
