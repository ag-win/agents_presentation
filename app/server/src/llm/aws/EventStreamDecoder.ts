import { crc32 } from 'node:zlib'
import { UpstreamError } from '../../errors/AppError.ts'

export interface EventMessage {
  /** String-valued headers such as ":event-type" and ":message-type". */
  readonly headers: Readonly<Record<string, string>>
  readonly payload: Uint8Array
}

const HEADER_SKIP: Record<number, number> = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 4, 5: 8, 8: 8, 9: 16 }

/**
 * Decodes the binary "application/vnd.amazon.eventstream" framing that AWS streaming APIs use.
 * Each message: total length, headers length, prelude CRC, headers, payload, message CRC (all big-endian).
 * Feed it chunks as they arrive; it returns the complete messages found so far and keeps the rest.
 */
export class EventStreamDecoder {
  private buffer = new Uint8Array(0)

  push(chunk: Uint8Array): EventMessage[] {
    const joined = new Uint8Array(this.buffer.length + chunk.length)
    joined.set(this.buffer)
    joined.set(chunk, this.buffer.length)
    this.buffer = joined

    const messages: EventMessage[] = []
    while (this.buffer.length >= 12) {
      const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength)
      const total = view.getUint32(0)
      const headersLength = view.getUint32(4)
      if (crc32(this.buffer.subarray(0, 8)) !== view.getUint32(8)) throw new UpstreamError('Corrupt response from AWS (bad prelude checksum)')
      if (this.buffer.length < total) break
      if (crc32(this.buffer.subarray(0, total - 4)) !== view.getUint32(total - 4)) throw new UpstreamError('Corrupt response from AWS (bad message checksum)')
      messages.push({
        headers: EventStreamDecoder.parseHeaders(this.buffer.subarray(12, 12 + headersLength)),
        payload: this.buffer.slice(12 + headersLength, total - 4),
      })
      this.buffer = this.buffer.subarray(total)
    }
    return messages
  }

  private static parseHeaders(bytes: Uint8Array): Record<string, string> {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const decoder = new TextDecoder()
    const headers: Record<string, string> = {}
    let i = 0
    while (i < bytes.length) {
      const nameLength = bytes[i++]
      const name = decoder.decode(bytes.subarray(i, i + nameLength))
      i += nameLength
      const type = bytes[i++]
      if (type === 7 || type === 6) {
        const length = view.getUint16(i)
        i += 2
        headers[name] = type === 7 ? decoder.decode(bytes.subarray(i, i + length)) : ''
        i += length
      } else {
        headers[name] = ''
        i += HEADER_SKIP[type] ?? 0
      }
    }
    return headers
  }
}
