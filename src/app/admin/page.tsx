"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { UserRole, UserStatus, Gender, PlayerLevel } from "@prisma/client"
import Navbar from "@/components/Navbar"
import Link from "next/link"

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

interface EditingField {
  userId: string
  field: string
}

interface NewUser {
  email: string
  password: string
  name: string
  gender: Gender | null
  level: PlayerLevel | null
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<UserStatus | "ALL">("PENDING")
  const [editingField, setEditingField] = useState<EditingField | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUser, setNewUser] = useState<NewUser>({
    email: "",
    password: "",
    name: "",
    gender: null,
    level: null,
  })
  const [saving, setSaving] = useState(false)
  const [creatingLeagues, setCreatingLeagues] = useState(false)
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [uploadingExcel, setUploadingExcel] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const startEditing = (userId: string, field: string, currentValue: string) => {
    setEditingField({ userId, field })
    setEditValues({ [field]: currentValue })
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditValues({})
  }

  const saveField = async (userId: string, field: string) => {
    const value = editValues[field]
    if (value === undefined) {
      cancelEditing()
      return
    }

    setSaving(true)
    try {
      const updateData: any = { [field]: value }
      
      // Handle password separately - only update if not empty
      if (field === "password") {
        if (!value || value.trim() === "") {
          cancelEditing()
          setSaving(false)
          return
        }
        updateData.password = value
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (res.ok) {
        await fetchUsers()
        cancelEditing()
      } else {
        const error = await res.json()
        alert(error.error || "Güncelleme başarısız")
      }
    } catch (error) {
      console.error("Error updating field:", error)
      alert("Güncelleme sırasında bir hata oluştu")
    } finally {
      setSaving(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      alert("Email, şifre ve isim gereklidir")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      if (res.ok) {
        setNewUser({
          email: "",
          password: "",
          name: "",
          gender: Gender.MALE,
          level: PlayerLevel.D,
        })
        setShowAddForm(false)
        await fetchUsers()
      } else {
        const error = await res.json()
        alert(error.error || "Kullanıcı oluşturma başarısız")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      alert("Kullanıcı oluşturma sırasında bir hata oluştu")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateLeagues = async () => {
    if (!confirm("Tüm ligleri oluşturmak istediğinizden emin misiniz? (Mevcut ligler atlanacak)")) {
      return
    }

    setCreatingLeagues(true)
    try {
      const res = await fetch("/api/admin/create-leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (res.ok) {
        alert(
          `Ligler başarıyla oluşturuldu!\nOluşturulan: ${data.created}\nAtlanan: ${data.skipped}\nSezon: ${data.season}`
        )
      } else {
        alert(data.error || "Lig oluşturma sırasında bir hata oluştu")
      }
    } catch (error) {
      console.error("Error creating leagues:", error)
      alert("Lig oluşturma sırasında bir hata oluştu")
    } finally {
      setCreatingLeagues(false)
    }
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingExcel(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/upload-players", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        let message = `Başarıyla yüklendi!\nEklenen: ${data.created}`
        if (data.errors && data.errors.length > 0) {
          message += `\nHatalı satır sayısı: ${data.errors.length}`
          if (data.errors.length <= 10) {
            message += `\n\nHatalar:\n${data.errors.join("\n")}`
          } else {
            message += `\n\nİlk 10 hata:\n${data.errors.slice(0, 10).join("\n")}\n... ve ${data.errors.length - 10} hata daha`
            console.error("Tüm hatalar:", data.errors)
          }
        }
        alert(message)
        setShowExcelUpload(false)
        fetchUsers()
      } else {
        alert(data.error || "Yükleme başarısız")
      }
    } catch (error) {
      console.error("Error uploading Excel:", error)
      alert("Yükleme sırasında bir hata oluştu")
    } finally {
      setUploadingExcel(false)
      e.target.value = ""
    }
  }

  if (!session || session.user.role !== UserRole.SUPERADMIN) {
    return <div>Unauthorized</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 ml-64">
        <div className="flex justify-between items-center mb-6 -mt-4">
          <h1 className="text-3xl font-bold">Superadmin Paneli</h1>
          <div className="flex gap-2">
            <button
              onClick={handleCreateLeagues}
              disabled={creatingLeagues}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {creatingLeagues ? "Oluşturuluyor..." : "🏆 Ligleri Oluştur"}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showAddForm ? "İptal" : "+ Yeni Oyuncu Ekle"}
            </button>
            <button
              onClick={() => setShowExcelUpload(!showExcelUpload)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              {showExcelUpload ? "İptal" : "📊 Excel ile Yükle"}
            </button>
          </div>
        </div>

        {showExcelUpload && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Excel ile Oyuncu Yükle</h2>
            <p className="text-sm text-gray-600 mb-4">
              Excel dosyası formatı: Email, Şifre, İsim, Cinsiyet (MALE/FEMALE), Seviye (MASTER/A/B/C/D)
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              disabled={uploadingExcel}
              className="mb-4"
            />
            {uploadingExcel && <p className="text-blue-600">Yükleniyor...</p>}
          </div>
        )}

        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Yeni Oyuncu Ekle</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Şifre *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Şifre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">İsim *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="İsim"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cinsiyet</label>
                <select
                  value={newUser.gender || ""}
                  onChange={(e) => {
                    const genderValue = e.target.value ? (e.target.value as Gender) : null
                    setNewUser({ ...newUser, gender: genderValue })
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seçilmedi</option>
                  <option value={Gender.MALE}>Erkek</option>
                  <option value={Gender.FEMALE}>Kadın</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Seviye</label>
                <select
                  value={newUser.level || ""}
                  onChange={(e) => {
                    const levelValue = e.target.value ? (e.target.value as PlayerLevel) : null
                    setNewUser({ ...newUser, level: levelValue })
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seçilmedi</option>
                  <option value={PlayerLevel.MASTER}>Master</option>
                  <option value={PlayerLevel.A}>A</option>
                  <option value={PlayerLevel.B}>B</option>
                  <option value={PlayerLevel.C}>C</option>
                  <option value={PlayerLevel.D}>D</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddUser}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </div>
          </div>
        )}

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
                    Şifre
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingField?.userId === user.id && editingField?.field === "name" ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValues.name || user.name}
                            onChange={(e) => setEditValues({ name: e.target.value })}
                            className="border rounded px-2 py-1 w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveField(user.id, "name")
                              if (e.key === "Escape") cancelEditing()
                            }}
                          />
                          <button
                            onClick={() => saveField(user.id, "name")}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className="font-medium cursor-pointer hover:text-blue-600"
                          onClick={() => startEditing(user.id, "name", user.name)}
                          title="Düzenlemek için tıklayın"
                        >
                          {user.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingField?.userId === user.id && editingField?.field === "email" ? (
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={editValues.email || user.email}
                            onChange={(e) => setEditValues({ email: e.target.value })}
                            className="border rounded px-2 py-1 w-48"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveField(user.id, "email")
                              if (e.key === "Escape") cancelEditing()
                            }}
                          />
                          <button
                            onClick={() => saveField(user.id, "email")}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => startEditing(user.id, "email", user.email)}
                          title="Düzenlemek için tıklayın"
                        >
                          {user.email}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingField?.userId === user.id && editingField?.field === "gender" ? (
                        <div className="flex gap-2">
                          <select
                            value={editValues.gender !== undefined ? editValues.gender : (user.gender || "")}
                            onChange={(e) => setEditValues({ gender: e.target.value || null })}
                            className="border rounded px-2 py-1"
                            autoFocus
                          >
                            <option value="">Seçilmedi</option>
                            <option value={Gender.MALE}>Erkek</option>
                            <option value={Gender.FEMALE}>Kadın</option>
                          </select>
                          <button
                            onClick={() => saveField(user.id, "gender")}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => startEditing(user.id, "gender", user.gender)}
                          title="Düzenlemek için tıklayın"
                        >
                          {user.gender === "MALE" ? "Erkek" : user.gender === "FEMALE" ? "Kadın" : "Seçilmedi"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingField?.userId === user.id && editingField?.field === "level" ? (
                        <div className="flex gap-2">
                          <select
                            value={editValues.level !== undefined ? editValues.level : (user.level || "")}
                            onChange={(e) => setEditValues({ level: e.target.value || null })}
                            className="border rounded px-2 py-1"
                            autoFocus
                          >
                            <option value="">Seçilmedi</option>
                            <option value={PlayerLevel.MASTER}>Master</option>
                            <option value={PlayerLevel.A}>A</option>
                            <option value={PlayerLevel.B}>B</option>
                            <option value={PlayerLevel.C}>C</option>
                            <option value={PlayerLevel.D}>D</option>
                          </select>
                          <button
                            onClick={() => saveField(user.id, "level")}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => startEditing(user.id, "level", user.level)}
                          title="Düzenlemek için tıklayın"
                        >
                          {user.level}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingField?.userId === user.id && editingField?.field === "password" ? (
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={editValues.password || ""}
                            onChange={(e) => setEditValues({ password: e.target.value })}
                            className="border rounded px-2 py-1 w-32"
                            placeholder="Yeni şifre"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveField(user.id, "password")
                              if (e.key === "Escape") cancelEditing()
                            }}
                          />
                          <button
                            onClick={() => saveField(user.id, "password")}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-blue-600 text-xs"
                          onClick={() => startEditing(user.id, "password", "")}
                          title="Şifre değiştirmek için tıklayın"
                        >
                          ••••••
                        </span>
                      )}
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
                      {editingField?.userId === user.id && editingField?.field === "status" ? (
                        <div className="flex gap-2">
                          <select
                            value={editValues.status || user.status}
                            onChange={(e) => setEditValues({ status: e.target.value })}
                            className="border rounded px-2 py-1"
                            autoFocus
                          >
                            <option value={UserStatus.PENDING}>Bekliyor</option>
                            <option value={UserStatus.APPROVED}>Onaylandı</option>
                            <option value={UserStatus.REJECTED}>Reddedildi</option>
                          </select>
                          <button
                            onClick={() => saveField(user.id, "status")}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded cursor-pointer hover:opacity-80 ${
                            user.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : user.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                          onClick={() => startEditing(user.id, "status", user.status)}
                          title="Düzenlemek için tıklayın"
                        >
                          {user.status === "APPROVED"
                            ? "Onaylandı"
                            : user.status === "REJECTED"
                            ? "Reddedildi"
                            : "Bekliyor"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {user.status === "PENDING" && (
                          <>
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
                          </>
                        )}
                        <Link
                          href={`/admin/players/${user.id}`}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Detay
                        </Link>
                      </div>
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
