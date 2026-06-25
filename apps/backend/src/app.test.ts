import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from './app.js'

describe('app', () => {
  it('GET / returns the API banner', async () => {
    const response = await request(app).get('/')
    expect(response.status).toBe(200)
    expect(response.text).toBe('Inventory API')
  })
})
