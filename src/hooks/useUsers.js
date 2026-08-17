import {
  useState,
} from "react";

import {
  api,
} from "../services/api";

const EMPTY_USER = {
  nick: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
};

export function useUsers() {
  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    assignmentUser,
    setAssignmentUser,
  ] = useState(null);

  const [
    assignmentApartmentId,
    setAssignmentApartmentId,
  ] = useState("");

  const [
    assignmentRelation,
    setAssignmentRelation,
  ] = useState("owner");

  const [
    userAssignments,
    setUserAssignments,
  ] = useState([]);

  const [
    showCreateUser,
    setShowCreateUser,
  ] = useState(false);

  const [
    newUser,
    setNewUser,
  ] = useState(
    EMPTY_USER
  );

  const [
    editingUser,
    setEditingUser,
  ] = useState(null);

  const [
    statusUser,
    setStatusUser,
  ] = useState(null);

  const loadUsers =
    async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await api(
            "/api/admin/users"
          );

        if (
          result?.error
        ) {
          throw new Error(
            result.error
          );
        }

        setUsers(
          Array.isArray(
            result
          )
            ? result
            : []
        );
      } catch (
        loadError
      ) {
        console.error(
          "LOAD USERS ERROR:",
          loadError
        );

        setUsers([]);

        setError(
          loadError?.message ||
          "Users could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    };

  const loadUserAssignments =
    async (
      userId
    ) => {
      const result =
        await api(
          "/api/admin/user-apartments?user_id=" +
            userId
        );

      setUserAssignments(
        Array.isArray(
          result
        )
          ? result
          : []
      );
    };

  const createUser =
    async () => {
      setError("");

      try {
        const result =
          await api(
            "/api/admin/create-user",
            {
              method: "POST",
              body:
                JSON.stringify(
                  newUser
                ),
            }
          );

        if (
          result?.error ||
          result?.ok === false
        ) {
          throw new Error(
            result?.error ||
            "Create failed"
          );
        }

        setShowCreateUser(
          false
        );

        setNewUser(
          EMPTY_USER
        );

        await loadUsers();

        return result;
      } catch (
        createError
      ) {
        setError(
          createError?.message ||
          "User could not be created."
        );

        throw createError;
      }
    };

  const updateUser =
    async (
      userData
    ) => {
      setError("");

      try {
        const result =
          await api(
            "/api/admin/update-user",
            {
              method: "POST",
              body:
                JSON.stringify({
                  id:
                    userData.id,
                  nick:
                    userData.nick,
                  first_name:
                    userData.first_name,
                  last_name:
                    userData.last_name,
                  email:
                    userData.email,
                  phone:
                    userData.phone,
                }),
            }
          );

        if (
          result?.error ||
          result?.ok === false
        ) {
          throw new Error(
            result?.error ||
            "Update failed"
          );
        }

        setEditingUser(
          null
        );

        await loadUsers();

        return result;
      } catch (
        updateError
      ) {
        setError(
          updateError?.message ||
          "User could not be updated."
        );

        throw updateError;
      }
    };

  const setUserStatus =
    async (
      userId,
      isActive
    ) => {
      setError("");

      try {
        const result =
          await api(
            "/api/admin/set-user-status",
            {
              method: "POST",
              body:
                JSON.stringify({
                  id: userId,
                  is_active:
                    isActive
                      ? 1
                      : 0,
                }),
            }
          );

        if (
          result?.error ||
          result?.ok === false
        ) {
          throw new Error(
            result?.error ||
            "Status update failed"
          );
        }

        setStatusUser(
          null
        );

        await loadUsers();

        return result;
      } catch (
        statusError
      ) {
        setError(
          statusError?.message ||
          "User status could not be changed."
        );

        throw statusError;
      }
    };

  const addAssignment =
    async () => {
      if (
        !assignmentUser ||
        !assignmentApartmentId
      ) {
        return;
      }

      const result =
        await api(
          "/api/admin/add-user-apartment",
          {
            method: "POST",
            body:
              JSON.stringify({
                user_id:
                  assignmentUser.id,
                apartment_id:
                  assignmentApartmentId,
                relation_type:
                  assignmentRelation,
              }),
          }
        );

      if (
        result?.error ||
        result?.ok === false
      ) {
        throw new Error(
          result?.error ||
          "Assignment failed"
        );
      }

      await loadUserAssignments(
        assignmentUser.id
      );

      await loadUsers();

      return result;
    };

  const removeAssignment =
    async (
      assignmentId
    ) => {
      const result =
        await api(
          "/api/admin/remove-user-apartment",
          {
            method: "POST",
            body:
              JSON.stringify({
                assignment_id:
                  assignmentId,
              }),
          }
        );

      if (
        result?.error ||
        result?.ok === false
      ) {
        throw new Error(
          result?.error ||
          "Remove failed"
        );
      }

      await loadUserAssignments(
        assignmentUser.id
      );

      await loadUsers();

      return result;
    };

  return {
    users,
    loading,
    error,
    loadUsers,

    assignmentUser,
    setAssignmentUser,

    assignmentApartmentId,
    setAssignmentApartmentId,

    assignmentRelation,
    setAssignmentRelation,

    userAssignments,
    setUserAssignments,

    showCreateUser,
    setShowCreateUser,

    newUser,
    setNewUser,

    editingUser,
    setEditingUser,

    statusUser,
    setStatusUser,

    createUser,
    updateUser,
    setUserStatus,

    loadUserAssignments,
    addAssignment,
    removeAssignment,
  };
}
