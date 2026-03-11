/**
 * Parses a time string like "08:00 AM" or "02:15 PM" into minutes from start of day.
 */
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;

    // Check for 12-hour format (AM/PM)
    const match12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12) {
        let [_, hours, minutes, period] = match12;
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    // Check for 24-hour format (HH:mm)
    const match24 = timeStr.match(/(\d+):(\d+)/);
    if (match24) {
        const hours = parseInt(match24[1]);
        const minutes = parseInt(match24[2]);
        return hours * 60 + minutes;
    }

    return null;
};

/**
 * Formats minutes from start of day into "HH:mm AM/PM" format.
 */
const formatMinutesToTime = (totalMinutes) => {
    let hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Calculates delay in minutes between current time and scheduled arrival.
 */
/**
 * Calculates delay in minutes between a reference time (or now) and scheduled arrival.
 * Reference time is used to ensure the delay is calculated as of the moment the event occurred.
 */
const calculateDelay = (scheduledTimeStr, referenceTimestamp = null) => {
    const scheduledMinutes = parseTimeToMinutes(scheduledTimeStr);
    if (scheduledMinutes === null) return 0;

    const date = referenceTimestamp ? new Date(referenceTimestamp) : new Date();

    // IST is UTC + 5:30
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();

    const currentMinutes = hours * 60 + minutes;

    return currentMinutes - scheduledMinutes;
};

module.exports = {
    parseTimeToMinutes,
    formatMinutesToTime,
    calculateDelay
};
