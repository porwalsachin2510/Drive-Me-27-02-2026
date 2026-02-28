import Trip from "../models/Trip.js";
import Route from "../models/Route.js";
import Contract from "../models/Contract.js";
import CorporateEmployee from "../models/CorporateEmployee.js";
import CorporateDriver from "../models/CorporateDriver.js";
import CorporateBooking from "../models/CorporateBooking.js";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import { io } from "../index.js";

// @desc    Get all daily trips for corporate employees
// @route   GET /api/corporate/daily-trips?date=YYYY-MM-DD
// @access  Private (CORPORATE)
export const getDailyTrips = async (req, res) => {
    try {
        const corporateId = req.userId;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date parameter is required (YYYY-MM-DD format)"
            });
        }

        // Parse the date
        const tripDate = new Date(date);
        tripDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(tripDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Find all trips for this corporate on this date
        const trips = await Trip.find({
            corporateId,
            tripDate: {
                $gte: tripDate,
                $lt: nextDay
            },
            status: { $in: ["SCHEDULED", "IN_PROGRESS"] }
        })
            .populate('contractId')
            .populate('routeId')
            .populate('vehicleId')
            .populate('driverId', 'name phoneNumber')
            .sort({ startTime: 1 });

        res.status(200).json({
            success: true,
            message: `Retrieved ${trips.length} trips for ${date}`,
            data: {
                date,
                tripCount: trips.length,
                trips
            }
        });

    } catch (error) {
        console.error("[v0] Error fetching daily trips:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching daily trips",
            error: error.message
        });
    }
};

// @desc    Get employee's assigned trips
// @route   GET /api/corporate/employee/:employeeId/trips?date=YYYY-MM-DD
// @access  Private (CORPORATE, EMPLOYEE)
export const getEmployeeAssignedTrips = async (req, res) => {
    try {
        const corporateId = req.userId;
        const { employeeId } = req.params;
        const { date } = req.query;

        // Verify employee belongs to this corporate
        const employee = await CorporateEmployee.findOne({
            _id: employeeId,
            corporateId
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found or doesn't belong to your corporate"
            });
        }

        let query = {
            corporateId,
            "passengers.employeeId": employee.userId
        };

        if (date) {
            const tripDate = new Date(date);
            tripDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(tripDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            query.tripDate = {
                $gte: tripDate,
                $lt: nextDay
            };
        } else {
            // Default to today onwards
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            query.tripDate = { $gte: today };
        }

        const trips = await Trip.find(query)
            .populate('vehicleId')
            .populate('driverId', 'name phoneNumber')
            .populate('routeId')
            .sort({ tripDate: 1, startTime: 1 });

        // Filter to only show employee's bookings
        const employeeTrips = trips.map(trip => {
            const employeeBooking = trip.passengers.find(p => p.employeeId.toString() === employee.userId.toString());
            return {
                _id: trip._id,
                tripDate: trip.tripDate,
                startTime: trip.startTime,
                endTime: trip.endTime,
                fromLocation: trip.fromLocation,
                toLocation: trip.toLocation,
                status: trip.status,
                driverInfo: trip.driverId,
                vehicleInfo: trip.vehicleId,
                seatNumber: employeeBooking?.seatNumber,
                pickupPoint: employeeBooking?.pickupPoint,
                pickupTime: employeeBooking?.pickupTime,
                bookingStatus: employeeBooking?.bookingStatus,
                currentLocation: trip.currentLocation
            };
        });

        res.status(200).json({
            success: true,
            message: `Retrieved ${employeeTrips.length} assigned trips for employee`,
            data: {
                employeeId,
                employeeName: employee.name,
                tripCount: employeeTrips.length,
                trips: employeeTrips
            }
        });

    } catch (error) {
        console.error("[v0] Error fetching employee trips:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching employee trips",
            error: error.message
        });
    }
};

// @desc    Assign route to vehicle and generate trips
// @route   POST /api/corporate/assign-route-to-vehicle
// @access  Private (CORPORATE)
export const assignRouteToVehicle = async (req, res) => {
    try {
        const corporateId = req.userId;
        const {
            routeId,
            vehicleId,
            driverId, // B2B driver (optional, if driver already assigned)
            corporateDriverId, // Corporate driver (optional)
            startDate,
            endDate
        } = req.body;

        // Validate route exists and belongs to corporate
        const route = await Route.findOne({
            _id: routeId,
            corporateId,
            status: "ACTIVE"
        });

        if (!route) {
            return res.status(404).json({
                success: false,
                message: "Route not found or inactive"
            });
        }

        // Validate vehicle exists
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        // Get contract to verify vehicle assignment
        const contract = await Contract.findById(route.contractId);
        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Contract not found"
            });
        }

        // Verify driver if provided
        let assignedDriver = null;
        let driverModel = null;

        if (driverId) {
            assignedDriver = await User.findOne({
                _id: driverId,
                role: "DRIVER"
            });
            if (!assignedDriver) {
                return res.status(404).json({
                    success: false,
                    message: "B2B Driver not found"
                });
            }
            driverModel = "Driver";
        }

        if (corporateDriverId) {
            assignedDriver = await CorporateDriver.findOne({
                _id: corporateDriverId,
                corporateId
            });
            if (!assignedDriver) {
                return res.status(404).json({
                    success: false,
                    message: "Corporate Driver not found"
                });
            }
            driverModel = "CorporateDriver";
        }

        // Update route with vehicle and driver assignment
        route.vehicleId = vehicleId;
        route.assignedVehicle = vehicleId;
        if (assignedDriver) {
            route.assignedDriver = assignedDriver._id;
        }
        await route.save();

        console.log("[v0] Route assigned successfully:", {
            routeId: route._id,
            vehicleId,
            driverId: assignedDriver?._id
        });

        res.status(200).json({
            success: true,
            message: "Route assigned to vehicle successfully",
            data: {
                routeId: route._id,
                vehicleId,
                driverId: assignedDriver?._id,
                driverModel,
                status: "ASSIGNED"
            }
        });

    } catch (error) {
        console.error("[v0] Error assigning route to vehicle:", error);
        res.status(500).json({
            success: false,
            message: "Error assigning route to vehicle",
            error: error.message
        });
    }
};

// @desc    Get route-vehicle assignment status
// @route   GET /api/corporate/assigned-routes-status?routeId=XXX
// @access  Private (CORPORATE)
export const getAssignedRoutesStatus = async (req, res) => {
    try {
        const corporateId = req.userId;
        const { routeId } = req.query;

        let query = { corporateId, status: "ACTIVE" };
        
        if (routeId) {
            query._id = routeId;
        }

        const routes = await Route.find(query)
            .populate({ path: 'vehicleId', strictPopulate: false })
            .populate({ path: 'assignedDriver', strictPopulate: false })
            .populate({ path: 'contractId', strictPopulate: false });

        const routeStatuses = routes.map(route => ({
            routeId: route._id,
            routeName: `${route.fromLocation} → ${route.toLocation}`,
            vehicleId: route.vehicleId,
            vehicleInfo: route.vehicleId ? {
                model: route.vehicleId.model,
                licensePlate: route.vehicleId.licensePlate,
                capacity: route.vehicleId.seatingCapacity
            } : null,
            driverId: route.assignedDriver?._id,
            driverInfo: route.assignedDriver ? {
                name: route.assignedDriver.name,
                phoneNumber: route.assignedDriver.phoneNumber
            } : null,
            assignmentStatus: route.vehicleId && route.assignedDriver ? "COMPLETE" : "INCOMPLETE",
            availableDays: route.availableDays,
            status: route.status
        }));

        res.status(200).json({
            success: true,
            message: `Retrieved ${routeStatuses.length} route assignments`,
            data: {
                totalRoutes: routeStatuses.length,
                routes: routeStatuses
            }
        });

    } catch (error) {
        console.error("[v0] Error fetching route status:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching route assignment status",
            error: error.message
        });
    }
};

// @desc    Assign employees to trip
// @route   POST /api/corporate/trips/:tripId/assign-employees
// @access  Private (CORPORATE)
export const assignEmployeesToTrip = async (req, res) => {
    try {
        const corporateId = req.userId;
        const { tripId } = req.params;
        const { employees } = req.body; // Array of { employeeUserId, seatNumber, pickupPoint, pickupTime }

        // Find trip
        const trip = await Trip.findOne({
            _id: tripId,
            corporateId
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found"
            });
        }

        if (trip.status !== "SCHEDULED") {
            return res.status(400).json({
                success: false,
                message: "Can only assign employees to scheduled trips"
            });
        }

        // Validate and add employees
        const assignedEmployees = [];
        const errors = [];

        for (const emp of employees) {
            const { employeeUserId, seatNumber, pickupPoint, pickupTime } = emp;

            // Verify employee exists and belongs to corporate
            const employee = await CorporateEmployee.findOne({
                userId: employeeUserId,
                corporateId
            });

            if (!employee) {
                errors.push(`Employee not found: ${employeeUserId}`);
                continue;
            }

            // Check if seat is available
            if (seatNumber > trip.totalSeats || seatNumber <= 0) {
                errors.push(`Invalid seat number for employee ${employee.name}`);
                continue;
            }

            // Check if seat is already booked
            const seatBooked = trip.passengers.some(p => p.seatNumber === seatNumber);
            if (seatBooked) {
                errors.push(`Seat ${seatNumber} already booked`);
                continue;
            }

            // Add passenger
            trip.passengers.push({
                employeeId: employee.userId,
                seatNumber,
                pickupPoint,
                pickupTime,
                bookingStatus: "CONFIRMED"
            });

            assignedEmployees.push({
                employeeName: employee.name,
                seatNumber,
                pickupPoint,
                pickupTime
            });
        }

        // Update available seats
        trip.bookedSeats = trip.passengers.length;
        trip.availableSeats = trip.totalSeats - trip.bookedSeats;

        await trip.save();

        res.status(200).json({
            success: true,
            message: `Assigned ${assignedEmployees.length} employees to trip`,
            data: {
                tripId,
                assignedCount: assignedEmployees.length,
                assignedEmployees,
                errors: errors.length > 0 ? errors : undefined,
                updatedTrip: {
                    tripId: trip._id,
                    bookedSeats: trip.bookedSeats,
                    availableSeats: trip.availableSeats
                }
            }
        });

    } catch (error) {
        console.error("[v0] Error assigning employees to trip:", error);
        res.status(500).json({
            success: false,
            message: "Error assigning employees to trip",
            error: error.message
        });
    }
};

// @desc    Get trip details with real-time tracking
// @route   GET /api/corporate/trips/:tripId/details
// @access  Private (CORPORATE, DRIVER, EMPLOYEE)
export const getTripDetails = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.userId;

        const trip = await Trip.findById(tripId)
            .populate('vehicleId')
            .populate('driverId', 'name phoneNumber profileImage')
            .populate('contractId')
            .populate('routeId')
            .populate({
                path: 'passengers.employeeId',
                select: 'name email phoneNumber'
            });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found"
            });
        }

        // Check access permissions
        const hasAccess = 
            trip.corporateId.toString() === userId ||
            trip.driverId._id.toString() === userId ||
            trip.passengers.some(p => p.employeeId._id.toString() === userId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: "You don't have access to this trip"
            });
        }

        res.status(200).json({
            success: true,
            message: "Trip details retrieved successfully",
            data: {
                tripId: trip._id,
                tripDate: trip.tripDate,
                startTime: trip.startTime,
                endTime: trip.endTime,
                fromLocation: trip.fromLocation,
                toLocation: trip.toLocation,
                status: trip.status,
                currentLocation: trip.currentLocation,
                vehicle: {
                    id: trip.vehicleId?._id,
                    model: trip.vehicleId?.model,
                    licensePlate: trip.vehicleId?.licensePlate,
                    capacity: trip.vehicleId?.seatingCapacity
                },
                driver: {
                    id: trip.driverId?._id,
                    name: trip.driverId?.name,
                    phoneNumber: trip.driverId?.phoneNumber,
                    image: trip.driverId?.profileImage
                },
                passengers: trip.passengers.map(p => ({
                    employeeName: p.employeeId?.name,
                    seatNumber: p.seatNumber,
                    pickupPoint: p.pickupPoint,
                    pickupTime: p.pickupTime,
                    bookingStatus: p.bookingStatus
                })),
                occupancy: {
                    totalSeats: trip.totalSeats,
                    bookedSeats: trip.bookedSeats,
                    availableSeats: trip.availableSeats
                }
            }
        });

    } catch (error) {
        console.error("[v0] Error fetching trip details:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching trip details",
            error: error.message
        });
    }
};

// @desc    Get all employee bookings for corporate operations
// @route   GET /api/corporate-operations/bookings
// @access  Private (CORPORATE only)
export const getCorporateEmployeeBookings = async (req, res) => {
    try {
        const corporateOwnerId = req.userId;
        const { status, startDate, endDate, employeeId, page = 1, limit = 20 } = req.query;

        console.log("[v0] Fetching corporate bookings for corporateOwnerId:", corporateOwnerId);

        const filter = { corporateOwnerId };

        // Use correct field name: bookingStatus not status
        if (status) filter.bookingStatus = status;
        if (employeeId) filter.passengerId = employeeId;
        if (startDate || endDate) {
            filter.travelDate = {};
            if (startDate) filter.travelDate.$gte = new Date(startDate);
            if (endDate) filter.travelDate.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const bookings = await CorporateBooking.find(filter)
            .populate("passengerId", "fullName email whatsappNumber")
            .populate("routeId", "fromLocation toLocation startTime endTime")
            .populate("driverId", "fullName email whatsappNumber")
            .populate("vehicleId", "model licensePlate")
            .populate("contractId", "contractNumber status")
            .sort({ travelDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await CorporateBooking.countDocuments(filter);

        const summary = {
            total: totalCount,
            confirmed: await CorporateBooking.countDocuments({ corporateOwnerId, bookingStatus: "CONFIRMED" }),
            inProgress: await CorporateBooking.countDocuments({ corporateOwnerId, bookingStatus: "IN_PROGRESS" }),
            completed: await CorporateBooking.countDocuments({ corporateOwnerId, bookingStatus: "COMPLETED" }),
            cancelled: await CorporateBooking.countDocuments({ corporateOwnerId, bookingStatus: "CANCELLED" }),
        };

        console.log("[v0] Found bookings:", bookings.length, "summary:", summary);

        res.status(200).json({
            success: true,
            bookings,
            data: {
                bookings,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalItems: totalCount,
                    itemsPerPage: parseInt(limit),
                },
                summary,
            },
        });
    } catch (error) {
        console.error("[v0] Error fetching corporate employee bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch employee bookings",
            error: error.message,
        });
    }
};
