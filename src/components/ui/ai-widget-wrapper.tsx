"use client"

import React, { useEffect, useState } from "react"
import { AiInputWidget } from "./ai-input"
import { createClient } from "@/lib/supabase/client"

export function AiWidgetWrapper() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setAuthed(!!data.user)
    })
  }, [])

  if (!authed) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AiInputWidget />
    </div>
  )
}
