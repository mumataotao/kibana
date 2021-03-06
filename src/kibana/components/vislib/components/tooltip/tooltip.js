define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var allContents = [];

    require('css!components/vislib/styles/main');

    /**
     * Add tooltip and listeners to visualization elements
     *
     * @class Tooltip
     * @constructor
     * @param el {HTMLElement} Reference to DOM element
     * @param formatter {Function} Tooltip formatter
     * @param events {Constructor} Allows tooltip to return event response data
     */
    function Tooltip(id, el, formatter, events) {
      if (!(this instanceof Tooltip)) {
        return new Tooltip(id, el, formatter, events);
      }

      this.id = id; // unique id for this tooltip type
      this.el = el;
      this.order = 100; // higher ordered contents are rendered below the others
      this.formatter = formatter;
      this.events = events;
      this.containerClass = 'vis-wrapper';
      this.tooltipClass = 'vis-tooltip';
      this.tooltipSizerClass = 'vis-tooltip-sizing-clone';
      this.showCondition = _.constant(true);

      this.$window = $(window);
      this.$chart = $(el).find('.' + this.containerClass);
    }

    Tooltip.prototype.$get = _.once(function () {
      return $('<div>').addClass(this.tooltipClass).appendTo(document.body);
    });

    Tooltip.prototype.$getSizer = _.once(function () {
      return this.$get()
      .clone()
        .removeClass(this.tooltipClass)
        .addClass(this.tooltipSizerClass)
        .appendTo(document.body);
    });

    /**
     * Calculates values for the tooltip placement
     *
     * @method getTooltipPlacement
     * @param event {Object} D3 Events Object
     * @returns {{Object}} Coordinates for tooltip
     */
    Tooltip.prototype.getTooltipPlacement = require('components/vislib/components/tooltip/_position_tooltip');

    /**
     * Renders tooltip
     *
     * @method render
     * @returns {Function} Renders tooltip on a D3 selection
     */
    Tooltip.prototype.render = function () {
      var self = this;
      var tooltipFormatter = this.formatter;

      return function (selection) {
        var $tooltip = self.$get();
        var $sizer = self.$getSizer();
        var id = self.id;
        var order = self.order;

        var tooltipSelection = d3.select($tooltip.get(0));

        if (self.container === undefined || self.container !== d3.select(self.el).select('.' + self.containerClass)) {
          self.container = d3.select(self.el).select('.' + self.containerClass);
        }

        self.$chart.on('mouseleave', function (event) {
          // if the mouse moves fast enough, it can "leave"
          // by entering the tooltip
          if ($tooltip.is(event.relatedTarget)) return;

          // only clear when we leave the chart, so that
          // moving between points doesn't make it reposition
          self.$chart.removeData('previousPlacement');
        });

        selection.each(function (d, i) {
          var element = d3.select(this);

          function render(html, placement) {
            allContents = _.filter(allContents, function (content) {
              return content.id !== id;
            });

            if (html) allContents.push({ id: id, html: html, order: order });

            var allHtml = _(allContents)
            .sortBy('order')
            .pluck('html')
            .compact()
            .join('\n');

            if (allHtml) {
              $tooltip.html(allHtml).css('visibility', 'visible');
            } else {
              $tooltip.css({
                visibility: 'hidden',
                left: '-500px',
                top: '-500px'
              });
            }

            if (placement) {
              $tooltip.css({
                left: placement.left + 'px',
                top: placement.top + 'px'
              });
            }
          }

          element
          .on('mousemove.tip', function update() {
            if (!self.showCondition.call(element, d, i)) {
              return render();
            }

            var event = d3.event;
            var placement = self.getTooltipPlacement({
              $window: self.$window,
              $chart: self.$chart,
              $el: $tooltip,
              $sizer: $sizer,
              event: event,
              prev: self.$chart.data('previousPlacement')
            });

            self.$chart.data('previousPlacement', placement);
            if (!placement) return;

            var events = self.events ? self.events.eventResponse(d, i) : d;
            var html = tooltipFormatter(events);
            if (!html) return render();

            render(html, placement);
          })
          .on('mouseout.tip', function () {
            render();
          });
        });
      };
    };

    return Tooltip;
  };
});
