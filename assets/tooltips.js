(function($) {
    $(document).ready(function() {
        $("[title]").style_my_tooltips({
            tip_follows_cursor: true,
            tip_delay_time: 30,
            tip_fade_speed: 300,
            attribute: "title"
        });
        feather.replace();
    });
})(jQuery);