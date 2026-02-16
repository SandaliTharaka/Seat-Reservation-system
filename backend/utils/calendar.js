const moment = require('moment');

const toIcsDate = (date) => moment(date).utc().format('YYYYMMDDTHHmmss[Z]');

const buildCalendarLinks = ({ title, description, location, start, end }) => {
  const text = encodeURIComponent(title);
  const details = encodeURIComponent(description || '');
  const loc = encodeURIComponent(location || '');
  const startUtc = moment(start).utc().format('YYYYMMDDTHHmmss[Z]');
  const endUtc = moment(end).utc().format('YYYYMMDDTHHmmss[Z]');

  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${loc}&dates=${startUtc}/${endUtc}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${text}&body=${details}&location=${loc}&startdt=${encodeURIComponent(moment(start).toISOString())}&enddt=${encodeURIComponent(moment(end).toISOString())}`
  };
};

const createIcsAttachment = ({ uid, title, description, location, start, end }) => {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seat Reservation System//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${location || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return {
    filename: 'seat-reservation.ics',
    content: icsContent,
    contentType: 'text/calendar'
  };
};

module.exports = {
  buildCalendarLinks,
  createIcsAttachment
};
