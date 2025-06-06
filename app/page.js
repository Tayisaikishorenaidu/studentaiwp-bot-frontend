'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Circles } from 'react-loader-spinner'
import { useAuth } from '@/context/AuthContext'

export default function Home() {
  const { currentUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [currentUser, loading, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Circles
        height="80"
        width="80"
        color="#3B82F6"
        ariaLabel="circles-loading"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
      />
    </div>
  )
}