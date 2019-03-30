// document.querySelectorAll('a[href^="#"]').forEach(anchor => {
//   anchor.addEventListener('click', function(e) {
//     e.preventDefault();

//     document.querySelector(this.getAttribute('href')).scrollIntoView({
//       behavior: 'smooth',
//     });
//   });
// });

// document.querySelectorAll('a[href^="/#"]').forEach(anchor => {
//   anchor.addEventListener('click', function(e) {
//     const el = document.querySelector(this.getAttribute('href').substr(1));
//     if (!el) {
//       return;
//     }
//     e.preventDefault();
//     el.scrollIntoView({
//       behavior: 'smooth',
//     });
//   });
// });

// Select all links with hashes
$('a[href*="#"]')
  // Remove links that don't actually link to anything
  .not('[href="#"]')
  .not('[href="#0"]')
  .click(function(event) {
    // On-page links
    if (
      location.pathname.replace(/^\//, '') ==
        this.pathname.replace(/^\//, '') &&
      location.hostname == this.hostname
    ) {
      // Figure out element to scroll to
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      // Does a scroll target exist?
      if (target.length) {
        // Only prevent default if animation is actually gonna happen
        event.preventDefault();
        $('html, body').animate(
          {
            scrollTop: target.offset().top,
          },
          1000,
          function() {
            // Callback after animation
            // Must change focus!
            var $target = $(target);
            $target.focus();
            if ($target.is(':focus')) {
              // Checking if the target was focused
              return false;
            } else {
              $target.attr('tabindex', '-1'); // Adding tabindex for elements not focusable
              $target.focus(); // Set focus again
            }
          },
        );
      }
    }
  });

$(window).scroll(function() {
  if ($(document).scrollTop() > 50) {
    $('header').addClass('shrink');
  } else {
    $('header').removeClass('shrink');
  }
});
