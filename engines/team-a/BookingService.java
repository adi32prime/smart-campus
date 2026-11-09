import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.sql.Connection;

/**
 * BookingService — orchestrates booking decisions for Team A.
 */
public class BookingService {

    // ----------------------------------------------------------------
    // Result carrier
    // ----------------------------------------------------------------
    public static class Result {
        public int bookingId = -1;
        public String status;         // "Confirmed", "Waitlisted", "Rejected"
        public String message;
        public int waitlistPosition;  // 0 if not waitlisted
        public int priority;
        public int queueSize;
        public boolean ok = true;
    }

    // ----------------------------------------------------------------
    // createOrWaitlist
    // ----------------------------------------------------------------
    public static Result createOrWaitlist(
            int userId,
            String labId,        // e.g. "L1"
            String date,         // "2026-10-15"
            String startTime,    // "10:00"
            String endTime,      // "12:00"
            String purpose,
            int priority
    ) {
        Result r = new Result();
        r.priority = priority;

        try {
            int resourceId = Db.findResourceIdByNode(labId);
            if (resourceId < 0) {
                r.ok = false;
                r.status = "Rejected";
                r.message = "Unknown labId: " + labId;
                return r;
            }

            int slotId = Db.findSlotId(startTime, endTime);
            if (slotId < 0) {
                r.ok = false;
                r.status = "Rejected";
                r.message = "No matching time slot for " + startTime + " - " + endTime;
                return r;
            }

            if (Db.userHasActiveBooking(userId, resourceId, slotId, date)) {
                r.ok = false;
                r.status = "Rejected";
                r.message = "You already have a request for this resource and slot";
                return r;
            }

            // Use a single database connection to lock the rows and prevent race conditions
            try (Connection conn = Db.get()) {
                conn.setAutoCommit(false);

                try {
                    // 1. Lock the resource row to serialize concurrent requests
                    String lockSql = "SELECT ResourceId FROM RESOURCES WHERE ResourceId = ? FOR UPDATE";
                    try (java.sql.PreparedStatement ps = conn.prepareStatement(lockSql)) {
                        ps.setInt(1, resourceId);
                        ps.executeQuery();
                    }

                    // 2. Check if occupied (using the SAME connection inside the transaction)
                    int confirmed = 0;
                    String countSql = "SELECT COUNT(*) FROM BOOKINGS WHERE ResourceId=? AND SlotId=? AND BookingDate=? AND Status IN ('Pending','Confirmed')";
                    try (java.sql.PreparedStatement ps = conn.prepareStatement(countSql)) {
                        ps.setInt(1, resourceId);
                        ps.setInt(2, slotId);
                        ps.setString(3, date);
                        try (java.sql.ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) confirmed = rs.getInt(1);
                        }
                    }

                    if (confirmed == 0) {
                        // Free → Confirmed
                        String insertSql = "INSERT INTO BOOKINGS (UserId, ResourceId, SlotId, BookingDate, Purpose, Status, Priority) VALUES (?,?,?,?,?,?,?)";
                        int id = -1;
                        try (java.sql.PreparedStatement ps = conn.prepareStatement(insertSql, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                            ps.setInt(1, userId);
                            ps.setInt(2, resourceId);
                            ps.setInt(3, slotId);
                            ps.setString(4, date);
                            ps.setString(5, purpose);
                            ps.setString(6, "Confirmed");
                            ps.setInt(7, priority);
                            ps.executeUpdate();
                            try (java.sql.ResultSet rs = ps.getGeneratedKeys()) {
                                if (rs.next()) id = rs.getInt(1);
                            }
                        }
                        
                        conn.commit();
                        Db.insertAudit(userId, "CREATE_BOOKING", "BOOKING", id, "Confirmed priority=" + priority);
                        r.bookingId = id;
                        r.status = "Confirmed";
                        r.message = "Booking confirmed";
                        return r;
                    }

                    // Occupied → Waitlisted
                    String insertSql = "INSERT INTO BOOKINGS (UserId, ResourceId, SlotId, BookingDate, Purpose, Status, Priority) VALUES (?,?,?,?,?,?,?)";
                    int id = -1;
                    try (java.sql.PreparedStatement ps = conn.prepareStatement(insertSql, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                        ps.setInt(1, userId);
                        ps.setInt(2, resourceId);
                        ps.setInt(3, slotId);
                        ps.setString(4, date);
                        ps.setString(5, purpose);
                        ps.setString(6, "Waitlisted");
                        ps.setInt(7, priority);
                        ps.executeUpdate();
                        try (java.sql.ResultSet rs = ps.getGeneratedKeys()) {
                            if (rs.next()) id = rs.getInt(1);
                        }
                    }

                    // Compute waitlist position INSIDE the transaction
                    int pos = 1;
                    String posSql = "SELECT COUNT(*) FROM BOOKINGS WHERE ResourceId=? AND SlotId=? AND BookingDate=? AND Status='Waitlisted' AND (Priority < ? OR (Priority = ? AND BookingId < ?))";
                    try (java.sql.PreparedStatement ps = conn.prepareStatement(posSql)) {
                        ps.setInt(1, resourceId);
                        ps.setInt(2, slotId);
                        ps.setString(3, date);
                        ps.setInt(4, priority);
                        ps.setInt(5, priority);
                        ps.setInt(6, id);
                        try (java.sql.ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) pos = rs.getInt(1) + 1;
                        }
                    }

                    // Update position inside the transaction
                    try (java.sql.PreparedStatement ps = conn.prepareStatement("UPDATE BOOKINGS SET WaitlistPosition = ? WHERE BookingId = ?")) {
                        ps.setInt(1, pos);
                        ps.setInt(2, id);
                        ps.executeUpdate();
                    }

                    conn.commit();
                    Db.insertAudit(userId, "WAITLIST_BOOKING", "BOOKING", id, "position=" + pos + " priority=" + priority);
                    r.bookingId = id;
                    r.status = "Waitlisted";
                    r.waitlistPosition = pos;
                    r.message = "Resource is occupied. You are waitlist #" + pos;
                    return r;

                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }
            }

        } catch (SQLException e) {
            r.ok = false;
            r.status = "Rejected";
            r.message = "DB error: " + e.getMessage();
            return r;
        }
    }

    // ----------------------------------------------------------------
    // promoteAfterCancel
    // ----------------------------------------------------------------
    public static Map<String, Object> promoteAfterCancel(
            String labId, String date, String startTime, String endTime
    ) {
        Map<String, Object> out = new HashMap<>();
        out.put("promoted", false);
        try {
            int resourceId = Db.findResourceIdByNode(labId);
            if (resourceId < 0) {
                out.put("message", "Unknown labId: " + labId);
                return out;
            }
            int slotId = Db.findSlotId(startTime, endTime);
            if (slotId < 0) {
                out.put("message", "No matching slot");
                return out;
            }

            int next = Db.pickNextWaiter(resourceId, slotId, date);
            if (next < 0) {
                out.put("message", "No waitlist entries");
                return out;
            }

            int winnerUserId = Db.getBookingUserId(next);
            Db.promoteBooking(next);
            Db.insertNotification(winnerUserId, next,
                    "Good news! Your waitlisted booking #" + next + " is now confirmed.");
            Db.insertAudit(winnerUserId, "PROMOTE_WAITLIST", "BOOKING", next, "Confirmed");

            out.put("promoted", true);
            out.put("bookingId", next);
            out.put("winnerUserId", winnerUserId);
            out.put("message", "Promoted booking #" + next);
            return out;

        } catch (SQLException e) {
            out.put("message", "DB error: " + e.getMessage());
            return out;
        }
    }
}