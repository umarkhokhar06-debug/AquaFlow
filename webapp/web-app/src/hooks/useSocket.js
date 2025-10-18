import { useEffect, useState, useCallback } from 'react'
import io from 'socket.io-client'

export const useSocket = (token) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000', {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      })

      newSocket.on('connect', () => {
        setConnected(true)
        setError(null)
        console.log('Socket connected:', newSocket.id)
      })

      newSocket.on('disconnect', (reason) => {
        setConnected(false)
        console.log('Socket disconnected:', reason)
      })

      newSocket.on('connect_error', (error) => {
        setConnected(false)
        setError(error.message)
        console.error('Socket connection error:', error)
        
        // Handle specific authentication errors
        if (error.message === 'Authentication token required') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        } else if (error.message === 'User account is blocked') {
          alert('Your account has been blocked')
        }
      })

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts')
        setConnected(true)
        setError(null)
      })

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error)
        setError(error.message)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [token])

  const joinRoom = useCallback((room) => {
    if (socket && connected) {
      socket.emit(room)
      console.log(`Joined room: ${room}`)
    }
  }, [socket, connected])

  const leaveRoom = useCallback((room) => {
    if (socket && connected) {
      socket.emit('leave-room', room)
      console.log(`Left room: ${room}`)
    }
  }, [socket, connected])

  const emitEvent = useCallback((event, data) => {
    if (socket && connected) {
      socket.emit(event, data)
    }
  }, [socket, connected])

  return { 
    socket, 
    connected, 
    error, 
    joinRoom, 
    leaveRoom, 
    emitEvent 
  }
}

export default useSocket

