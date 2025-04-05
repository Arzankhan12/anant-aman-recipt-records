import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle, XCircle } from "lucide-react";

// Define User interface
interface User {
  id: string | number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt?: Date;
}

export default function UserListTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string | number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted", description: "User removed successfully." });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user.",
      });
    },
  });

  // Toggle user active status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string | number; isActive: boolean }) => {
      try {
        console.log(`Updating user ${userId} (type: ${typeof userId})`);

        // Ensure user exists before making API call
        const existingUser = users.find((u) => u.id === userId);
        if (!existingUser) {
          throw new Error("User not found. Refresh the list.");
        }

        // Convert ID to string for consistency
        const idString = userId.toString();

        // API request
        const response = await apiRequest("PATCH", `/api/users/${idString}/status`, { isActive });

        // Validate response
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} - ${response.statusText}`);
        }

        return response.json() as Promise<User & { shouldLogout?: boolean }>;
      } catch (error) {
        console.error("Error in toggleUserStatusMutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      const statusText = data.isActive ? "activated" : "deactivated";
      toast({ title: `User ${statusText}`, description: `${data.fullName} is now ${statusText}.` });

      if (data.shouldLogout) {
        toast({
          title: "Your account has been deactivated",
          description: "Logging out now.",
          variant: "destructive",
        });

        setTimeout(() => {
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("user");
          window.location.href = "/";
        }, 1000);
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user status.",
      });
    },
  });

  const handleToggleStatus = (userId: string | number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const action = newStatus ? "activate" : "deactivate";

    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      toggleUserStatusMutation.mutate({ userId, isActive: newStatus });
    }
  };

  const handleDeleteUser = (userId: string | number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-gray-800">Registered Users</h2>
        <div className="relative">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">No users found.</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4">
                        <AvatarFallback className="bg-primary text-white">{getInitials(user.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-gray-500">Joined on {user.createdAt ? formatDate(user.createdAt) : "N/A"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={() => handleToggleStatus(user.id, user.isActive)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => handleToggleStatus(user.id, user.isActive)}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" className="text-red-500" onClick={() => handleDeleteUser(user.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
