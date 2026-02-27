import User from "../models/User.js";
import CorporateEmployee from "../models/CorporateEmployee.js";
import Contract from "../models/Contract.js";
import CorporateBooking from "../models/CorporateBooking.js";
import Route from "../models/Route.js";
import VehicleAssignment from "../models/VehicleAssignment.js";
import { sendEmail } from "../Services/emailService.js";

// Register corporate employee
export const registerCorporateEmployee = async (req, res) => {
    try {
        const {
            companyEmail,
            employeeId,
            fullName,
            email,
            password,
            contactNumber,
            department,
            designation,
            workShift,
            pickupLocation,
            dropoffLocation
        } = req.body;

        // Verify company email matches invitation
        const company = await User.findOne({
            email: companyEmail,
            role: "CORPORATE"
        });

        if (!company) {
            return res.status(400).json({
                success: false,
                message: "Invalid company email or company not found"
            });
        }

        // Check if employee already exists
        const existingEmployee = await CorporateEmployee.findOne({
            $or: [
                { employeeId },
                { "personalInfo.email": email },
                { "personalInfo.phoneNumber": contactNumber }
            ]
        });

        if (existingEmployee) {
            return res.status(400).json({
                success: false,
                message: "Employee already registered"
            });
        }

        // Create user account
        const user = new User({
            fullName,
            email,
            password,
            role: "CORPORATE_EMPLOYEE",
            companyId: company._id,
            isActive: true
        });

        await user.save();

        // Parse full name into first/last
        const nameParts = (fullName || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || firstName;

        // Create corporate employee record with correct schema mapping
        const employee = new CorporateEmployee({
            userId: user._id,
            companyId: company._id,
            employeeId,
            personalInfo: {
                firstName,
                lastName,
                email,
                phoneNumber: contactNumber || "",
                department: department || "",
                designation: designation || "",
                workLocation: ""
            },
            transportDetails: {
                pickupPoint: pickupLocation || "",
                dropOffPoint: dropoffLocation || "",
                shiftType: workShift || "FULL_DAY",
                transportStatus: "ACTIVE"
            },
            accessControl: {
                isActive: true,
                accessLevel: "EMPLOYEE"
            },
            documents: {
                verificationStatus: "VERIFIED"
            }
        });

        await employee.save();

        // Send welcome email
        await sendWelcomeEmail(user, employee);

        res.status(201).json({
            success: true,
            message: "Employee registered successfully",
            data: {
                employeeId: employee._id,
                userId: user._id
            }
        });

    } catch (error) {
        console.error("Error registering corporate employee:", error);
        res.status(500).json({
            success: false,
            message: "Error registering employee",
            error: error.message
        });
    }
};

// Get employee dashboard
export const getEmployeeDashboard = async (req, res) => {
    try {
        const userId = req.userId;
        const { period = 'month' } = req.query;

        // Get employee details
        const employee = await CorporateEmployee.findOne({ userId })
            .populate('companyId', 'companyName businessName fullName')
            .populate('transportDetails.assignedRoute', 'routeName fromLocation toLocation pickupPoints dropoffPoints stopPoints');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Get travel history
        const travelHistory = await getEmployeeTravelHistory(userId, period);

        // Get upcoming trips
        const upcomingTrips = await getUpcomingTrips(userId);

        // Get assigned vehicle details
        const vehicleInfo = await getAssignedVehicleInfo(userId);

        res.status(200).json({
            success: true,
            data: {
                employee: {
                    employeeId: employee.employeeId,
                    fullName: employee.fullName,
                    email: employee.personalInfo?.email,
                    phoneNumber: employee.personalInfo?.phoneNumber,
                    department: employee.personalInfo?.department,
                    designation: employee.personalInfo?.designation,
                    shiftType: employee.transportDetails?.shiftType,
                    pickupPoint: employee.transportDetails?.pickupPoint,
                    dropOffPoint: employee.transportDetails?.dropOffPoint,
                    route: employee.transportDetails?.assignedRoute
                },
                company: {
                    companyName: employee.companyId?.companyName || employee.companyId?.fullName,
                    businessName: employee.companyId?.businessName
                },
                travelHistory,
                upcomingTrips,
                vehicleInfo,
                summary: await getEmployeeSummary(userId, period)
            }
        });

    } catch (error) {
        console.error("Error getting employee dashboard:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving employee dashboard",
            error: error.message
        });
    }
};

// View assigned route and timings
export const getAssignedRoute = async (req, res) => {
    try {
        const userId = req.userId;

        const employee = await CorporateEmployee.findOne({ userId })
            .populate('transportDetails.assignedRoute', 'routeName fromLocation toLocation pickupPoints dropoffPoints stopPoints');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        const assignedRoute = employee.transportDetails?.assignedRoute;

        // Get schedule details
        const schedule = assignedRoute?._id ? await getRouteSchedule(assignedRoute._id) : { schedule: [] };

        res.status(200).json({
            success: true,
            data: {
                route: assignedRoute ? {
                    routeName: assignedRoute.routeName,
                    fromLocation: assignedRoute.fromLocation,
                    toLocation: assignedRoute.toLocation,
                    pickupPoints: assignedRoute.pickupPoints,
                    dropoffPoints: assignedRoute.dropoffPoints,
                    stopPoints: assignedRoute.stopPoints
                } : null,
                vehicle: null, // Will be populated from VehicleAssignment when available
                schedule,
                seatNumber: employee.transportDetails?.seatNumber,
                pickupPoint: employee.transportDetails?.pickupPoint,
                dropOffPoint: employee.transportDetails?.dropOffPoint
            }
        });

    } catch (error) {
        console.error("Error getting assigned route:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving assigned route",
            error: error.message
        });
    }
};

// Book/cancel specific days
export const manageBooking = async (req, res) => {
    try {
        const userId = req.userId;
        const { action, dates, reason } = req.body;

        const employee = await CorporateEmployee.findOne({ userId });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        if (action === "book") {
            // Book specific days
            const bookings = [];
            for (const date of dates) {
                const booking = await createEmployeeBooking(employee, date);
                bookings.push(booking);
            }

            res.status(201).json({
                success: true,
                message: "Days booked successfully",
                data: { bookings }
            });

        } else if (action === "cancel") {
            // Cancel specific days
            const cancellations = [];
            for (const date of dates) {
                const cancellation = await cancelEmployeeBooking(employee, date, reason);
                cancellations.push(cancellation);
            }

            res.status(200).json({
                success: true,
                message: "Days cancelled successfully",
                data: { cancellations }
            });

        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid action"
            });
        }

    } catch (error) {
        console.error("Error managing booking:", error);
        res.status(500).json({
            success: false,
            message: "Error managing booking",
            error: error.message
        });
    }
};

// Mark not traveling today
export const markNotTravelingToday = async (req, res) => {
    try {
        const userId = req.userId;
        const { date, reason } = req.body;

        const employee = await CorporateEmployee.findOne({ userId });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Cancel today's bookings for this employee
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const cancelResult = await CorporateBooking.updateMany(
            {
                passengerId: employee._id,
                travelDate: { $gte: today, $lt: tomorrow },
                status: { $in: ["SCHEDULED", "CONFIRMED", "BOOKED"] }
            },
            {
                $set: {
                    status: "CANCELLED",
                    cancellationReason: reason || "Employee reported not traveling",
                    cancelledAt: new Date()
                }
            }
        );

        // Also record in the employee's attendance
        if (!employee.attendance) employee.attendance = {};
        if (!employee.attendance.dailyAttendance) employee.attendance.dailyAttendance = [];
        employee.attendance.dailyAttendance.push({
            date: today,
            status: "ABSENT",
            notes: reason || "Reported not traveling"
        });
        await employee.save();

        // Notify manager
        await notifyManagerOfAbsence(employee, reason);

        res.status(200).json({
            success: true,
            message: "Absence reported successfully",
            data: {
                date,
                reason,
                status: "REPORTED"
            }
        });

    } catch (error) {
        console.error("Error marking not traveling:", error);
        res.status(500).json({
            success: false,
            message: "Error reporting absence",
            error: error.message
        });
    }
};

// Rate trip and provide feedback
export const rateTrip = async (req, res) => {
    try {
        const userId = req.userId;
        const { tripId, rating, feedback, complaints } = req.body;

        const employee = await CorporateEmployee.findOne({ userId });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Update the booking with feedback data
        const booking = await CorporateBooking.findOneAndUpdate(
            {
                _id: tripId,
                passengerId: employee._id
            },
            {
                $set: {
                    "feedback.rating": rating,
                    "feedback.comment": feedback || "",
                    "feedback.complaints": complaints || [],
                    "feedback.ratedAt": new Date()
                }
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Trip not found or you are not the passenger"
            });
        }

        res.status(201).json({
            success: true,
            message: "Trip rated successfully",
            data: {
                tripId: booking._id,
                rating,
                feedback,
                ratedAt: new Date()
            }
        });

    } catch (error) {
        console.error("Error rating trip:", error);
        res.status(500).json({
            success: false,
            message: "Error rating trip",
            error: error.message
        });
    }
};

// Request route change
export const requestRouteChange = async (req, res) => {
    try {
        const userId = req.userId;
        const { currentRouteId, newRouteId, reason, effectiveDate } = req.body;

        const employee = await CorporateEmployee.findOne({ userId });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Create route change request
        const changeRequest = {
            employeeId: employee._id,
            currentRouteId,
            newRouteId,
            reason,
            effectiveDate: new Date(effectiveDate),
            status: "PENDING",
            requestedAt: new Date()
        };

        // This would integrate with a RouteChangeRequest model
        // For now, just return success

        // Notify manager
        await notifyManagerOfRouteChange(employee, changeRequest);

        res.status(201).json({
            success: true,
            message: "Route change request submitted",
            data: changeRequest
        });

    } catch (error) {
        console.error("Error requesting route change:", error);
        res.status(500).json({
            success: false,
            message: "Error requesting route change",
            error: error.message
        });
    }
};

// Helper functions
const getEmployeeTravelHistory = async (userId, period) => {
    try {
        const employee = await CorporateEmployee.findOne({ userId })
            .populate('companyId', 'companyName');

        if (!employee) {
            return {
                totalTrips: 0,
                presentTrips: 0,
                absentTrips: 0,
                onTimeRate: 0
            };
        }

        // Calculate date range based on period
        const today = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            default:
                startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get corporate bookings for this employee
        const bookings = await CorporateBooking.find({
            passengerId: userId,
            travelDate: {
                $gte: startDate,
                $lte: today
            }
        }).populate('routeId', 'fromLocation toLocation');

        const totalTrips = bookings.length;
        const presentTrips = bookings.filter(booking => 
            booking.bookingStatus === 'COMPLETED'
        ).length;
        const absentTrips = bookings.filter(booking => 
            booking.bookingStatus === 'CANCELLED'
        ).length;
        
        // Calculate on-time rate (assuming completed trips with ratings are on-time)
        const onTimeTrips = bookings.filter(booking => 
            booking.bookingStatus === 'COMPLETED' && booking.rating && booking.rating >= 4
        ).length;
        const onTimeRate = presentTrips > 0 ? (onTimeTrips / presentTrips) * 100 : 0;

        return {
            totalTrips,
            presentTrips,
            absentTrips,
            onTimeRate: parseFloat(onTimeRate.toFixed(1))
        };

    } catch (error) {
        console.error("Error getting employee travel history:", error);
        return {
            totalTrips: 0,
            presentTrips: 0,
            absentTrips: 0,
            onTimeRate: 0
        };
    }
};

const getUpcomingTrips = async (userId) => {
    try {
        const employee = await CorporateEmployee.findOne({ userId })
            .populate('transportDetails.assignedRoute', 'fromLocation toLocation stopPoints')
            .populate('companyId', 'companyName');

        if (!employee || !employee.transportDetails?.assignedRoute) {
            return { trips: [] };
        }

        // Get upcoming trips for next 7 days
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const bookings = await CorporateBooking.find({
            passengerId: userId,
            travelDate: {
                $gte: today,
                $lte: nextWeek
            },
            bookingStatus: { $in: ['CONFIRMED', 'IN_PROGRESS'] }
        })
        .populate('driverId', 'fullName contactNumber')
        .populate('routeId', 'fromLocation toLocation')
        .sort({ travelDate: 1, pickupLocation: 1 });

        const trips = bookings.map(booking => ({
            date: booking.travelDate.toISOString().split('T')[0],
            time: booking.travelPath.find(path => path.isFromLocation)?.time || 'Not specified',
            route: `${booking.routeId?.fromLocation || 'Unknown'} → ${booking.routeId?.toLocation || 'Unknown'}`,
            vehicleNumber: booking.vehiclePlate || 'Not assigned',
            driverName: booking.driverId?.fullName || 'Not assigned',
            driverContact: booking.driverId?.contactNumber || booking.driverPhoneNumber || 'Not available',
            bookingId: booking._id,
            pickupLocation: booking.pickupLocation,
            dropoffLocation: booking.dropoffLocation
        }));

        return { trips };

    } catch (error) {
        console.error("Error getting upcoming trips:", error);
        return { trips: [] };
    }
};

const getAssignedVehicleInfo = async (userId) => {
    try {
        const employee = await CorporateEmployee.findOne({ userId })
            .populate('transportDetails.assignedRoute', 'fromLocation toLocation')
            .populate('companyId', 'companyName');

        if (!employee) {
            return {
                vehicleNumber: null,
                vehicleType: null,
                capacity: null,
                driverName: null,
                driverContact: null,
                seatNumber: null
            };
        }

        // Get vehicle assignment for this employee through contracts
        let vehicleAssignment = null;
        try {
            const contracts = await Contract.find({ corporateOwnerId: employee.companyId }).distinct('_id');
            vehicleAssignment = await VehicleAssignment.findOne({
                contractId: { $in: contracts }
            }).populate('vehicleId', 'vehicleNumber vehicleType capacity')
              .populate('driverId', 'fullName contactNumber');
        } catch (e) {
            // Ignore if vehicle assignment not found
        }

        return {
            vehicleNumber: vehicleAssignment?.vehicleId?.vehicleNumber || null,
            vehicleType: vehicleAssignment?.vehicleId?.vehicleType || null,
            capacity: vehicleAssignment?.vehicleId?.capacity || null,
            driverName: vehicleAssignment?.driverId?.fullName || 'Not assigned',
            driverContact: vehicleAssignment?.driverId?.contactNumber || 'Not available',
            seatNumber: employee.transportDetails?.seatNumber || 'Not assigned'
        };

    } catch (error) {
        console.error("Error getting assigned vehicle info:", error);
        return {
            vehicleNumber: null,
            vehicleType: null,
            capacity: null,
            driverName: null,
            driverContact: null,
            seatNumber: null
        };
    }
};

const getRouteSchedule = async (routeId) => {
    try {
        const route = await Route.findById(routeId)
            .populate('contractId', 'corporateOwnerId')
            .populate('vehicleId', 'vehicleNumber vehicleType');

        if (!route) {
            return {
                routeId,
                schedule: [],
                error: "Route not found"
            };
        }

        // Generate schedule based on route stop points
        const schedule = route.stopPoints.map(stop => ({
            day: "MONDAY", // Default to Monday - can be enhanced for different days
            pickupTime: stop.time,
            dropoffTime: stop.time, // Same time for simplicity - can be enhanced
            location: stop.location
        }));

        return {
            routeId,
            routeName: `${route.fromLocation} → ${route.toLocation}`,
            fromLocation: route.fromLocation,
            toLocation: route.toLocation,
            stopPoints: route.stopPoints,
            schedule,
            vehicleInfo: route.vehicleId ? {
                vehicleNumber: route.vehicleId.vehicleNumber,
                vehicleType: route.vehicleId.vehicleType
            } : null
        };

    } catch (error) {
        console.error("Error getting route schedule:", error);
        return {
            routeId,
            schedule: [],
            error: "Failed to get route schedule"
        };
    }
};

const createEmployeeBooking = async (employee, date) => {
    try {
        // Check if booking already exists for this date
        const existingBooking = await CorporateBooking.findOne({
            passengerId: employee.userId,
            travelDate: new Date(date),
            bookingStatus: { $in: ['CONFIRMED', 'IN_PROGRESS'] }
        });

        if (existingBooking) {
            return {
                success: false,
                message: "Booking already exists for this date",
                booking: existingBooking
            };
        }

        // Create new booking
        const booking = new CorporateBooking({
            passengerId: employee.userId,
            corporateOwnerId: employee.companyId,
            routeId: employee.routeId,
            contractId: await getActiveContractForEmployee(employee._id),
            driverId: await getAssignedDriverForEmployee(employee._id),
            pickupLocation: employee.pickupLocation || employee.residentialAddress?.area,
            dropoffLocation: employee.dropoffLocation,
            travelDate: new Date(date),
            bookingDate: new Date(),
            bookingStatus: "CONFIRMED"
        });

        await booking.save();

        return {
            success: true,
            bookingId: booking._id,
            employeeId: employee._id,
            date,
            status: "CONFIRMED",
            createdAt: booking.createdAt
        };

    } catch (error) {
        console.error("Error creating employee booking:", error);
        return {
            success: false,
            message: "Failed to create booking",
            error: error.message
        };
    }
};

const cancelEmployeeBooking = async (employee, date, reason) => {
    try {
        // Find existing booking for this date
        const booking = await CorporateBooking.findOne({
            passengerId: employee.userId,
            travelDate: new Date(date),
            bookingStatus: { $in: ['CONFIRMED', 'IN_PROGRESS'] }
        });

        if (!booking) {
            return {
                success: false,
                message: "No booking found for this date"
            };
        }

        // Update booking status to cancelled
        booking.bookingStatus = "CANCELLED";
        booking.cancelledAt = new Date();
        if (reason) {
            booking.passengerNotes = reason;
        }

        await booking.save();

        return {
            success: true,
            bookingId: booking._id,
            employeeId: employee._id,
            date,
            reason,
            status: "CANCELLED",
            cancelledAt: booking.cancelledAt
        };

    } catch (error) {
        console.error("Error cancelling employee booking:", error);
        return {
            success: false,
            message: "Failed to cancel booking",
            error: error.message
        };
    }
};

const getEmployeeSummary = async (userId, period) => {
    try {
        const employee = await CorporateEmployee.findOne({ userId });

        if (!employee) {
            return {
                totalTravelDays: 0,
                presentDays: 0,
                absentTrips: 0,
                onTimePercentage: 0,
                averageRating: 0
            };
        }

        // Calculate date range based on period
        const today = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            default:
                startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get all bookings in the period
        const bookings = await CorporateBooking.find({
            passengerId: userId,
            travelDate: {
                $gte: startDate,
                $lte: today
            }
        });

        const totalTravelDays = bookings.length;
        const presentDays = bookings.filter(booking => 
            booking.bookingStatus === 'COMPLETED'
        ).length;
        const absentTrips = bookings.filter(booking => 
            booking.bookingStatus === 'CANCELLED'
        ).length;

        // Calculate on-time percentage (completed trips with good ratings)
        const onTimeTrips = bookings.filter(booking => 
            booking.bookingStatus === 'COMPLETED' && booking.rating && booking.rating >= 4
        ).length;
        const onTimePercentage = presentDays > 0 ? (onTimeTrips / presentDays) * 100 : 0;

        // Calculate average rating
        const ratedTrips = bookings.filter(booking => booking.rating);
        const averageRating = ratedTrips.length > 0 
            ? ratedTrips.reduce((sum, booking) => sum + booking.rating, 0) / ratedTrips.length 
            : 0;

        return {
            totalTravelDays,
            presentDays,
            absentTrips,
            onTimePercentage: parseFloat(onTimePercentage.toFixed(1)),
            averageRating: parseFloat(averageRating.toFixed(1))
        };

    } catch (error) {
        console.error("Error getting employee summary:", error);
        return {
            totalTravelDays: 0,
            presentDays: 0,
            absentTrips: 0,
            onTimePercentage: 0,
            averageRating: 0
        };
    }
};

const sendWelcomeEmail = async (user, employee) => {
    try {
        await sendEmail({
            to: user.email,
            subject: "Welcome to Corporate Transport System - DriveMe",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to DriveMe Corporate Transport!</h2>
                    <p>Hello <strong>${employee.fullName || user.fullName}</strong>,</p>
                    <p>You have been successfully registered for the corporate transport system.</p>
                    <p>You can now login and view your assigned route, schedule, and manage your daily travel.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background: #1a237e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Login Now</a>
                </div>
            `
        });
    } catch (error) {
        console.error("Error sending welcome email:", error);
    }
};

const notifyManagerOfAbsence = async (employee, reason) => {
    try {
        const manager = await User.findById(employee.companyId);
        if (manager) {
            await sendEmail({
                to: manager.email,
                subject: "Employee Absence Report - DriveMe",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Employee Absence Report</h2>
                        <p>Hello <strong>${manager.fullName}</strong>,</p>
                        <p>An employee has reported absence from today's transport service.</p>
                        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p><strong>Employee:</strong> ${employee.fullName || employee.personalInfo?.firstName + ' ' + employee.personalInfo?.lastName}</p>
                            <p><strong>Email:</strong> ${employee.personalInfo?.email || 'N/A'}</p>
                            <p><strong>Reason:</strong> ${reason || 'Not provided'}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                `
            });
        }
    } catch (error) {
        console.error("Error notifying manager of absence:", error);
    }
};

const notifyManagerOfRouteChange = async (employee, changeRequest) => {
    try {
        const manager = await User.findById(employee.companyId);
        if (manager) {
            await sendEmail({
                to: manager.email,
                subject: "Route Change Request - DriveMe",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Route Change Request</h2>
                        <p>Hello <strong>${manager.fullName}</strong>,</p>
                        <p>An employee has requested a route change.</p>
                        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p><strong>Employee:</strong> ${employee.fullName || employee.personalInfo?.firstName + ' ' + employee.personalInfo?.lastName}</p>
                            <p><strong>Reason:</strong> ${changeRequest.reason || 'Not provided'}</p>
                            <p><strong>Effective Date:</strong> ${changeRequest.effectiveDate ? new Date(changeRequest.effectiveDate).toLocaleDateString() : 'ASAP'}</p>
                        </div>
                        <p>Please review and approve/reject this request from your dashboard.</p>
                    </div>
                `
            });
        }
    } catch (error) {
        console.error("Error notifying manager of route change:", error);
    }
};

// Helper functions for database operations
const getActiveContractForEmployee = async (employeeId) => {
    try {
        const employee = await CorporateEmployee.findById(employeeId);
        const activeContract = await Contract.findOne({
            corporateOwnerId: employee.companyId,
            status: 'ACTIVE'
        });
        return activeContract?._id || null;
    } catch (error) {
        console.error("Error getting active contract:", error);
        return null;
    }
};

const getAssignedDriverForEmployee = async (employeeId) => {
    try {
        const employee = await CorporateEmployee.findById(employeeId);
        const vehicleAssignment = await VehicleAssignment.findOne({
            contractId: { $in: await Contract.find({ corporateOwnerId: employee.companyId }).distinct('_id') },
            vehicleId: employee.vehicleId
        }).populate('driverId');
        
        return vehicleAssignment?.driverId?._id || null;
    } catch (error) {
        console.error("Error getting assigned driver:", error);
        return null;
    }
};
