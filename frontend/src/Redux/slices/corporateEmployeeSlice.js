import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import corporateEmployeeAPI from "../../services/corporateEmployeeAPI";

// Async thunks for API calls
export const fetchEmployeeTrips = createAsyncThunk(
  "corporateEmployee/fetchTrips",
  async ({ employeeId, date }, { rejectWithValue }) => {
    try {
      const response = await corporateEmployeeAPI.getEmployeeTrips(
        employeeId,
        date
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch trips"
      );
    }
  }
);

export const fetchAssignedRoute = createAsyncThunk(
  "corporateEmployee/fetchAssignedRoute",
  async (employeeId, { rejectWithValue }) => {
    try {
      const response = await corporateEmployeeAPI.getEmployeeAssignedRoute(
        employeeId
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch assigned route"
      );
    }
  }
);

export const fetchNoShowHistory = createAsyncThunk(
  "corporateEmployee/fetchNoShowHistory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await corporateEmployeeAPI.getNoShowHistory();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch no-show history"
      );
    }
  }
);

export const fetchNotifications = createAsyncThunk(
  "corporateEmployee/fetchNotifications",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await corporateEmployeeAPI.getNotifications(userId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch notifications"
      );
    }
  }
);

export const checkInTrip = createAsyncThunk(
  "corporateEmployee/checkInTrip",
  async (tripId, { rejectWithValue }) => {
    try {
      const response = await corporateEmployeeAPI.checkInTrip(tripId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to check in"
      );
    }
  }
);

export const cancelTrip = createAsyncThunk(
  "corporateEmployee/cancelTrip",
  async (tripId, { rejectWithValue }) => {
    try {
      const response = await corporateEmployeeAPI.cancelTrip(tripId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to cancel trip"
      );
    }
  }
);

// Initial state
const initialState = {
  employee: {
    id: null,
    name: null,
    email: null,
    assignedRoute: null,
  },
  trips: {
    data: [],
    loading: false,
    error: null,
    date: null,
  },
  assignedRoute: {
    data: null,
    loading: false,
    error: null,
  },
  noShowHistory: {
    data: [],
    loading: false,
    error: null,
  },
  notifications: {
    data: [],
    loading: false,
    error: null,
  },
  ui: {
    driverLocation: null,
    lastRefresh: null,
  },
};

// Slice
const corporateEmployeeSlice = createSlice({
  name: "corporateEmployee",
  initialState,
  reducers: {
    // Synchronous actions
    setEmployeeData: (state, action) => {
      state.employee = action.payload;
    },
    setDriverLocation: (state, action) => {
      state.ui.driverLocation = action.payload;
      state.ui.lastRefresh = new Date().toISOString();
    },
    clearError: (state, action) => {
      if (action.payload === "trips") {
        state.trips.error = null;
      } else if (action.payload === "route") {
        state.assignedRoute.error = null;
      } else if (action.payload === "notifications") {
        state.notifications.error = null;
      }
    },
    addNotification: (state, action) => {
      state.notifications.data.unshift(action.payload);
    },
    updateTripStatus: (state, action) => {
      const { tripId, status } = action.payload;
      const trip = state.trips.data.find((t) => t._id === tripId);
      if (trip) {
        trip.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch employee trips
    builder
      .addCase(fetchEmployeeTrips.pending, (state) => {
        state.trips.loading = true;
        state.trips.error = null;
      })
      .addCase(fetchEmployeeTrips.fulfilled, (state, action) => {
        state.trips.loading = false;
        // Dashboard API returns { success, data: { upcomingTrips, bookings, travelHistory, ... } }
        const payload = action.payload;
        state.trips.data = payload?.data?.upcomingTrips || payload?.data?.bookings || payload?.trips || [];
        state.trips.date = action.payload.date || new Date().toISOString().split('T')[0];
      })
      .addCase(fetchEmployeeTrips.rejected, (state, action) => {
        state.trips.loading = false;
        state.trips.error = action.payload;
      });

    // Fetch assigned route
    builder
      .addCase(fetchAssignedRoute.pending, (state) => {
        state.assignedRoute.loading = true;
        state.assignedRoute.error = null;
      })
      .addCase(fetchAssignedRoute.fulfilled, (state, action) => {
        state.assignedRoute.loading = false;
        state.assignedRoute.data = action.payload.data;
      })
      .addCase(fetchAssignedRoute.rejected, (state, action) => {
        state.assignedRoute.loading = false;
        state.assignedRoute.error = action.payload;
      });

    // Fetch no-show history
    builder
      .addCase(fetchNoShowHistory.pending, (state) => {
        state.noShowHistory.loading = true;
        state.noShowHistory.error = null;
      })
      .addCase(fetchNoShowHistory.fulfilled, (state, action) => {
        state.noShowHistory.loading = false;
        const payload = action.payload;
        state.noShowHistory.data = payload?.data?.noShows || payload?.noShows || payload?.data || [];
        // Ensure it's always an array
        if (!Array.isArray(state.noShowHistory.data)) {
          state.noShowHistory.data = [];
        }
      })
      .addCase(fetchNoShowHistory.rejected, (state, action) => {
        state.noShowHistory.loading = false;
        state.noShowHistory.error = action.payload;
      });

    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.notifications.loading = true;
        state.notifications.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications.loading = false;
        const payload = action.payload;
        state.notifications.data = payload?.data?.notifications || payload?.notifications || [];
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.notifications.loading = false;
        state.notifications.error = action.payload;
      });

    // Check in trip
    builder
      .addCase(checkInTrip.pending, (state) => {
        state.trips.loading = true;
      })
      .addCase(checkInTrip.fulfilled, (state, action) => {
        state.trips.loading = false;
        const updatedTrip = action.payload.data;
        const tripIndex = state.trips.data.findIndex(
          (t) => t._id === updatedTrip._id
        );
        if (tripIndex !== -1) {
          state.trips.data[tripIndex] = updatedTrip;
        }
      })
      .addCase(checkInTrip.rejected, (state, action) => {
        state.trips.loading = false;
        state.trips.error = action.payload;
      });

    // Cancel trip
    builder
      .addCase(cancelTrip.pending, (state) => {
        state.trips.loading = true;
      })
      .addCase(cancelTrip.fulfilled, (state, action) => {
        state.trips.loading = false;
        state.trips.data = state.trips.data.filter(
          (t) => t._id !== action.payload.tripId
        );
      })
      .addCase(cancelTrip.rejected, (state, action) => {
        state.trips.loading = false;
        state.trips.error = action.payload;
      });
  },
});

// Selectors
export const selectEmployeeTrips = (state) =>
  state.corporateEmployee.trips.data;
export const selectTripsLoading = (state) =>
  state.corporateEmployee.trips.loading;
export const selectTripsError = (state) => state.corporateEmployee.trips.error;

export const selectAssignedRoute = (state) =>
  state.corporateEmployee.assignedRoute.data;
export const selectRouteLoading = (state) =>
  state.corporateEmployee.assignedRoute.loading;

export const selectNotifications = (state) =>
  state.corporateEmployee.notifications.data;
export const selectNoShowHistory = (state) =>
  state.corporateEmployee.noShowHistory.data;

export const selectDriverLocation = (state) =>
  state.corporateEmployee.ui.driverLocation;

// Export actions and reducer
export const {
  setEmployeeData,
  setDriverLocation,
  clearError,
  addNotification,
  updateTripStatus,
} = corporateEmployeeSlice.actions;

export default corporateEmployeeSlice.reducer;
