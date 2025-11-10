"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { UserRole, UserStatus } from "@prisma/client"
import Navbar from "@/components/Navbar"

interface User {
  id: string
  email: string
  name: string
  gender: string
  level: string
  status: UserStatus
  role: UserRole
  createdAt: string
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<UserStatus | "ALL">("PENDING")

  useEffect(() => {
    if (session?.user) {
      fetchUsers()
    }
  }, [session, filter])

  const fetchUsers = async () => {
    try {
      const statusParam = filter === "ALL" ? "" : `?status=${filter}`
      const res = await fetch(`/api/users${statusParam}`)
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string, status: UserStatus) => {
    try {
      const res = await fetch("/api/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Error approving user:", error)
    }
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Error updating role:", error)
    }
  }

  if (!session || session.user.role !== UserRole.SUPERADMIN) {
    return <div>Unauthorized</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Superadmin Paneli</h1>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-4 py-2 rounded ${
              filter === "PENDING" ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`px-4 py-2 rounded ${
              filter === "APPROVED" ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Onaylananlar
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded ${
              filter === "ALL" ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Tümü
          </button>
        </div>

        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    İsim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cinsiyet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Seviye
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.gender === "MALE" ? "Erkek" : "Kadın"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as UserRole)
                        }
                        className="border rounded px-2 py-1"
                      >
                        <option value={UserRole.PLAYER}>Oyuncu</option>
                        <option value={UserRole.CAPTAIN}>Kaptan</option>
                        <option value={UserRole.MANAGER}>Yönetici</option>
                        <option value={UserRole.SUPERADMIN}>Superadmin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded ${
                          user.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : user.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {user.status === "APPROVED"
                          ? "Onaylandı"
                          : user.status === "REJECTED"
                          ? "Reddedildi"
                          : "Bekliyor"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleApprove(user.id, UserStatus.APPROVED)
                            }
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() =>
                              handleApprove(user.id, UserStatus.REJECTED)
                            }
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Reddet
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

