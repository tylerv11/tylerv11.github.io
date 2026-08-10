// Contact details are assembled at runtime (not present as plain text in the
// HTML/JS source) so bulk scrapers grepping for email/phone patterns come up empty.
// A real browser executing this script sees the same info a static mailto/tel link would show.
(function () {
  var EMAIL_CODES = [116,121,108,101,114,118,105,110,99,101,110,116,64,97,108,117,109,110,105,46,117,115,99,46,101,100,117];
  var PHONE_CODES = [40,52,54,57,41,32,50,52,51,45,48,48,55,51];

  function decode(codes) {
    return String.fromCharCode.apply(null, codes);
  }

  function getEmail() { return decode(EMAIL_CODES); }
  function getPhone() { return decode(PHONE_CODES); }
  function getPhoneDigits() { return getPhone().replace(/\D/g, ''); }

  function hydrate() {
    document.querySelectorAll('[data-contact="email"]').forEach(function (el) {
      var email = getEmail();
      el.textContent = email;
      el.setAttribute('href', 'mailto:' + email);
    });
    document.querySelectorAll('[data-contact="phone"]').forEach(function (el) {
      el.textContent = getPhone();
      el.setAttribute('href', 'tel:' + getPhoneDigits());
    });
  }

  window.TVContact = { getEmail: getEmail, getPhone: getPhone };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
})();
