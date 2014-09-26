define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorAgg', function ($compile, $parse, Private, Notifier) {
    var _ = require('lodash');
    var $ = require('jquery');
    var aggTypes = Private(require('components/agg_types/index'));

    require('apps/visualize/editor/agg_param');

    var notify = new Notifier({
      location: 'visAggGroup'
    });

    return {
      restrict: 'E',
      replace: true,
      template: require('text!apps/visualize/editor/agg.html'),
      scope: {
        vis: '=',
        agg: '=',
        $index: '=',
        group: '=',
        groupName: '=',
        groupMin: '='
      },
      link: function ($scope, $el) {
        $scope.aggTypeOptions = aggTypes.byType[$scope.groupName];
        $scope.editorOpen = $scope.agg.brandNew;

        $scope.$watchMulti([
          '$index',
          'group.length'
        ], function () {
          var i = $scope.$index;
          $scope.$first = i === 0;
          $scope.$last = i === $scope.group.length - 1;
        });

        (function setupControlManagement() {
          var $editorContainer = $el.find('.vis-editor-agg-editor');

          if ($scope.agg.schema.editor) {
            var $schemaEditor = $('<div>').prependTo($editorContainer);
            $schemaEditor.append($scope.agg.schema.editor);
            $compile($schemaEditor)(editorScope());
          }

          var $aggParamEditors;
          var $aggParamEditorsScope;
          $scope.$watch('agg.type', function updateAggParamEditor() {
            if ($aggParamEditors) {
              $aggParamEditors.remove();
              $aggParamEditorsScope.$destroy();
              $aggParamEditors = $aggParamEditorsScope = null;
            }

            var agg = $scope.agg;
            var type = $scope.agg.type;

            if (!agg) return;
            agg.fillDefaults();

            if (!type) return;

            var editors = type.params.map(function (param, i) {
              if (!param.editor) return;

              return $('<vis-agg-param-editor>')
              .attr({
                'agg-type': 'agg.type',
                'agg-config': 'agg',
                'agg-param': 'agg.type.params[' + i + ']',
                'params': 'agg.params'
              })
              .append(param.editor)
              .get(0);
            }).filter(Boolean);

            $aggParamEditors = $(editors).appendTo($editorContainer);
            $aggParamEditorsScope = $scope.$new();
            $compile($aggParamEditors)($aggParamEditorsScope);
          });

          // generic child scope creation, for both schema and agg
          function editorScope() {
            var $editorScope = $scope.$new();

            setupBoundProp($editorScope, 'agg.type', 'aggType');
            setupBoundProp($editorScope, 'agg', 'aggConfig');
            setupBoundProp($editorScope, 'agg.params', 'params');

            return $editorScope;
          }

          // bind a property from our scope a child scope, with one-way binding
          function setupBoundProp($child, get, set) {
            var getter = _.partial($parse(get), $scope);
            var setter = _.partial($parse(set).assign, $child);
            $scope.$watch(getter, setter);
          }
        }());

        /**
         * Describe the aggregation, for display in the collapsed agg header
         * @return {[type]} [description]
         */
        $scope.describe = function () {
          if (!$scope.agg.type.makeLabel) return '';
          var label = $scope.agg.type.makeLabel($scope.agg);
          return label ? label : '';
        };

        /**
         * Describe the errors in this agg
         * @return {[type]} [description]
         */
        $scope.describeError = function () {
          var count = _.reduce($scope.aggForm.$error, function (count, controls, errorType) {
            return count + _.size(controls);
          }, 0);

          return count + ' Error' + (count > 1 ? 's' : '');
        };

        $scope.moveUp = function (agg) {
          var aggs = $scope.vis.aggs;

          var i = aggs.indexOf(agg);
          if (i <= 0) return notify.log('already first');
          aggs.splice(i, 1);

          // find the most previous bucket agg
          var d = i - 1;
          for (; d > 0 && aggs[d].schema.group !== 'buckets'; d--) ;

          // place this right before
          aggs.splice(d, 0, agg);
        };

        $scope.moveDown = function (agg) {
          var aggs = $scope.vis.aggs;

          var i = aggs.indexOf(agg);
          if (i >= aggs.length - 1) return notify.log('already last');
          aggs.splice(i, 1);

          // find the next bucket agg
          var d = i;
          for (; d < aggs.length && aggs[d].schema.group !== 'buckets'; d++) ;

          // place this agg right after
          aggs.splice(d + 1, 0, agg);
        };

        $scope.remove = function (agg) {
          var aggs = $scope.vis.aggs;

          var index = aggs.indexOf(agg);
          if (index === -1) return notify.log('already removed');

          aggs.splice(index, 1);
        };
      }
    };
  });
});