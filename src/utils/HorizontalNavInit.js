export var horizontalMenu = function () {
    var horMenu = document.querySelector('[data-layout="navbar"] .hk-menu .menu-group');
    if (horMenu) {
        var horMenuRect = horMenu.getBoundingClientRect(),
            liTotalWidth = 0,
            liCount = 0,
            extraLiHide = 0;

        document.querySelectorAll('.more-nav-item').forEach(function (a) {
            a.remove()
        })

        var liElements = horMenu.firstChild.childNodes;
        for (var i = 0; i < liElements.length; i++) {
            liElements[i].removeAttribute("style");
            liTotalWidth += liElements[i].offsetWidth;
            liCount++;
        }


        if (window.innerWidth > 1199) {
            var visibleLi = parseInt(horMenuRect.width / (liTotalWidth / liCount)) - 2;
            visibleLi -= extraLiHide;
            visibleLi = Math.max(0, visibleLi); // Ensure visibleLi is not negative

            if (visibleLi < liCount) {
                var horWrapper = document.createElement("li");
                horWrapper.className = "nav-item more-nav-item";
                horWrapper.id = "more_nav_item"
                horWrapper.innerHTML = "<a class='nav-link' href='#' data-bs-toggle='collapse' data-bs-target='#dash_more'><span class='nav-icon-wrap'><span class='svg-icon'><svg xmlns='http://www.w3.org/2000/svg' class='icon icon-tabler icon-tabler-dots' width='24' height='24' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' fill='none' stroke-linecap='round' stroke-linejoin='round'> <path stroke='none' d='M0 0h24v24H0z' fill='none'></path> <circle cx='5' cy='12' r='1'></circle> <circle cx='12' cy='12' r='1'></circle> <circle cx='19' cy='12' r='1'></circle></svg></span></span></a><ul id='dash_more' class='nav flex-column collapse nav-children'></ul>";

                var ulElement = horMenu.querySelector("ul");
                for (i = visibleLi; i < liCount; i++) {
                    var currentLi = liElements[i],
                        clone = currentLi.cloneNode(true);

                    horWrapper.querySelector("ul").appendChild(clone);
                    currentLi.style.display = "none";
                }
                ulElement.appendChild(horWrapper);
            }
        };
    }

    var targetElementsHor = document.querySelectorAll('[data-layout="navbar"] .hk-menu .menu-content-wrap .navbar-nav li');
    for (i = 0; i < targetElementsHor.length; i++) {
        targetElementsHor[i].addEventListener('mouseenter',
            function () {
                var ulElement = this.querySelector('ul');
                if (ulElement) {
                    var ulOff = ulElement.getBoundingClientRect();
                    var ulLeft = ulOff.left;
                    var ulWidth = ulElement.offsetWidth;
                    var isEntirelyVisible = (ulLeft + ulWidth <= window.innerWidth);
                    if (!isEntirelyVisible) {
                        this.classList.add('edge');
                    }
                }
            });

        targetElementsHor[i].addEventListener('mouseleave', function () {
            this.classList.remove('edge');
        });
    }
};