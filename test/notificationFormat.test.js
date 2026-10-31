import assert from 'node:assert';
import { formatPushNotification, resolveNotificationPath } from '../src/sw/notificationFormat.js';

// Fixed evaluation context: Oct 28, 2026, 12:15 PM IST (06:45:00 UTC)
const ctx = {
  now: '2026-10-28T06:45:00Z',
  timeZone: 'Asia/Kolkata',
};

console.log('Running notification format verification test suite...\n');

let passed = 0;

function runCase(name, actual, expectedTitle, expectedBody) {
  try {
    assert.strictEqual(actual.title, expectedTitle, `[${name}] Title mismatch`);
    assert.strictEqual(actual.body, expectedBody, `[${name}] Body mismatch`);
    console.log(`✓ Case passed: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ Case FAILED: ${name}`);
    console.error(`  Expected Title: ${JSON.stringify(expectedTitle)}`);
    console.error(`  Actual Title:   ${JSON.stringify(actual.title)}`);
    console.error(`  Expected Body:  ${JSON.stringify(expectedBody)}`);
    console.error(`  Actual Body:    ${JSON.stringify(actual.body)}`);
    throw err;
  }
}

// 1. DM text
runCase(
  '1. DM text',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c1',
    chatName: 'Priya',
    chatKind: 'dm',
    alertKind: 'message',
    senderName: 'Priya',
    msgType: 'text',
    preview: 'Are we deploying today?',
    newCount: '1',
    unread: '1',
  }, ctx),
  'Priya',
  'Are we deploying today?'
);

// 2. Group text
runCase(
  '2. Group text',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c2',
    chatName: 'Team Lunch',
    chatKind: 'group',
    alertKind: 'message',
    senderName: 'Priya',
    msgType: 'text',
    preview: 'Are we deploying today?',
    newCount: '1',
    unread: '1',
  }, ctx),
  'Team Lunch',
  'Priya: Are we deploying today?'
);

// 3. Group merged (5 msgs)
runCase(
  '3. Group merged (5 msgs)',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c2',
    chatName: 'Team Lunch',
    chatKind: 'group',
    alertKind: 'message',
    newCount: '5',
    unread: '5',
    items: JSON.stringify([
      { s: 'User1', t: 'text', x: 'Msg 1' },
      { s: 'User2', t: 'text', x: 'Msg 2' },
      { s: 'Arjun', t: 'text', x: 'Staging passed all checks' },
      { s: 'Rakesh', t: 'voice', x: '' },
      { s: 'Renis', t: 'image', x: '' },
    ]),
  }, ctx),
  'Team Lunch · 5 new messages',
  'Arjun: Staging passed all checks\nRakesh: 🎤 Voice message\nRenis: 📷 Photo\n+2 more'
);

// 4. Reply in group
runCase(
  '4. Reply in group',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c2',
    chatName: 'Team Lunch',
    chatKind: 'group',
    alertKind: 'reply',
    senderName: 'Priya',
    msgType: 'text',
    preview: 'Ship at 6, then.',
  }, ctx),
  'Priya replied to you in Team Lunch',
  'Ship at 6, then.'
);

// 5. Mention in group
runCase(
  '5. Mention in group',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c2',
    chatName: 'Team Lunch',
    chatKind: 'group',
    alertKind: 'mention',
    senderName: 'Priya',
    msgType: 'text',
    preview: '@Yokesh please review the PR',
  }, ctx),
  'Priya mentioned you in Team Lunch',
  '@Yokesh please review the PR'
);

// 6. Photo in group
runCase(
  '6. Photo in group',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c2',
    chatName: 'Team Lunch',
    chatKind: 'group',
    alertKind: 'message',
    senderName: 'Renis',
    msgType: 'image',
    preview: '',
    newCount: '1',
  }, ctx),
  'Team Lunch',
  'Renis: 📷 Photo'
);

// 7. Voice in DM
runCase(
  '7. Voice in DM',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c3',
    chatName: 'Rakesh',
    chatKind: 'dm',
    alertKind: 'message',
    senderName: 'Rakesh',
    msgType: 'voice',
    preview: '',
    newCount: '1',
  }, ctx),
  'Rakesh',
  '🎤 Voice message'
);

// 8. Poll in group
runCase(
  '8. Poll in group',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c2',
    chatName: 'Team Lunch',
    chatKind: 'group',
    alertKind: 'message',
    senderName: 'Kavya',
    msgType: 'poll',
    preview: '',
    newCount: '1',
  }, ctx),
  'Team Lunch',
  'Kavya: 📊 Poll'
);

// 9. Assignment in room
runCase(
  '9. Assignment in room',
  formatPushNotification({
    v: '2',
    type: 'CHAT',
    chatId: 'c4',
    chatName: 'CSE-A Classroom',
    chatKind: 'room',
    alertKind: 'message',
    senderName: 'Dr. T. Kavitha',
    msgType: 'assignment',
    preview: 'Assignment 4: Data Structures',
    newCount: '1',
  }, ctx),
  'CSE-A Classroom',
  'Dr. T. Kavitha: 📚 Assignment: Assignment 4: Data Structures'
);

// 10. Event Reminder
runCase(
  '10. Event Reminder',
  formatPushNotification({
    v: '2',
    type: 'EVENT',
    action: 'reminder',
    eventId: 'e1',
    eventTitle: 'Team lunch',
    minutesBefore: '15',
    startTime: '2026-10-28T07:00:00Z',
    location: 'Cafeteria',
    chatName: 'Team Lunch',
  }, ctx),
  'Team lunch starts in 15 min',
  '12:30 PM · Cafeteria · Team Lunch'
);

// 11. Event Created
runCase(
  '11. Event Created',
  formatPushNotification({
    v: '2',
    type: 'EVENT_CHANGED',
    action: 'created',
    eventId: 'e1',
    eventTitle: 'Team lunch',
    startTime: '2026-10-28T07:00:00Z',
    location: 'Cafeteria',
    chatName: 'Team Lunch',
  }, ctx),
  'New event: Team lunch',
  'Today, 12:30 PM · Cafeteria · Team Lunch'
);

// 12. Event Rescheduled
runCase(
  '12. Event Rescheduled',
  formatPushNotification({
    v: '2',
    type: 'EVENT_CHANGED',
    action: 'rescheduled',
    eventId: 'e1',
    eventTitle: 'Team lunch',
    startTime: '2026-10-28T07:30:00Z',
    chatName: 'Team Lunch',
    changes: JSON.stringify([{ field: 'time', from: '2026-10-28T07:00:00Z', to: '2026-10-28T07:30:00Z' }]),
  }, ctx),
  'Team lunch was rescheduled',
  'Time: 12:30 PM → 1:00 PM\nTeam Lunch'
);

// 13. Event Cancelled
runCase(
  '13. Event Cancelled',
  formatPushNotification({
    v: '2',
    type: 'EVENT_CHANGED',
    action: 'cancelled',
    eventId: 'e1',
    eventTitle: 'Team lunch',
    startTime: '2026-10-28T07:00:00Z',
    chatName: 'Team Lunch',
  }, ctx),
  'Team lunch was cancelled',
  'Was today at 12:30 PM · Team Lunch'
);

// 14. Booking Request
runCase(
  '14. Booking Request',
  formatPushNotification({
    v: '2',
    type: 'EVENT_CHANGED',
    action: 'booking_request',
    eventId: 'e2',
    personName: 'Anil',
    startTime: '2026-10-29T09:30:00Z',
  }, ctx),
  'Meeting request from Anil',
  'Thu, Oct 29 · 3:00 PM'
);

// 15. Booking Approved
runCase(
  '15. Booking Approved',
  formatPushNotification({
    v: '2',
    type: 'EVENT_CHANGED',
    action: 'booking_approved',
    eventId: 'e2',
    personName: 'Anil',
    startTime: '2026-10-29T09:30:00Z',
  }, ctx),
  'Meeting confirmed with Anil',
  'Thu, Oct 29 · 3:00 PM'
);

// 16. Daily Summary
runCase(
  '16. Daily Summary',
  formatPushNotification({
    v: '2',
    type: 'DAILY',
    total: '3',
    date: '2026-10-28',
    eventsV2: JSON.stringify([
      { id: '1', title: 'Stand-up', startTime: '2026-10-28T04:00:00Z' },
      { id: '2', title: 'Team lunch', startTime: '2026-10-28T07:00:00Z' },
      { id: '3', title: 'Code review', startTime: '2026-10-28T10:30:00Z' },
    ]),
  }, ctx),
  'Today: 3 events',
  '9:30 AM Stand-up\n12:30 PM Team lunch\n4:00 PM Code review'
);

// 17. Missing Assignments
runCase(
  '17. Missing Assignments',
  formatPushNotification({
    v: '2',
    type: 'ASSIGNMENT_MISSING',
    total: '2',
    assignmentsV2: JSON.stringify([
      { id: '1', title: 'Assignment 4', deadline: '2026-10-28T09:45:00Z' },
      { id: '2', title: 'Lab report', deadline: '2026-10-29T10:00:00Z' },
    ]),
  }, ctx),
  '2 assignments due soon',
  'Assignment 4 · due in 3 hours\nLab report · due tomorrow'
);

// Test resolveNotificationPath
console.log('\nTesting resolveNotificationPath...');
assert.strictEqual(resolveNotificationPath({ type: 'CHAT', chatId: 'c1' }), '/chat/c1');
assert.strictEqual(resolveNotificationPath({ type: 'CHAT', chatId: 'c1', spaceId: '2', msgId: 'm123' }), '/chat/c1?spaceId=2&msgId=m123');
assert.strictEqual(resolveNotificationPath({ type: 'EVENT', eventId: 'e1' }), '/calendar?eventId=e1&viewInfo=true');
assert.strictEqual(resolveNotificationPath({ type: 'EVENT_CHANGED', action: 'cancelled', eventId: 'e1' }), '/calendar');
assert.strictEqual(resolveNotificationPath({ type: 'DAILY' }), '/calendar');
assert.strictEqual(resolveNotificationPath({ type: 'ASSIGNMENT_MISSING' }), '/communities');
console.log('✓ resolveNotificationPath passed all test cases');

// Test silent mode
console.log('\nTesting data.silent handling...');
const silentNotif = formatPushNotification({
  v: '2',
  type: 'CHAT',
  chatId: 'c1',
  chatName: 'Priya',
  chatKind: 'dm',
  preview: 'Silent text',
  silent: 'true',
}, ctx);
assert.strictEqual(silentNotif.silent, true);
assert.strictEqual(silentNotif.renotify, false);
assert.deepStrictEqual(silentNotif.vibrate, []);
console.log('✓ Silent notification honored properly');

console.log(`\n🎉 All tests passed successfully! (${passed} formatting scenarios verified)`);
