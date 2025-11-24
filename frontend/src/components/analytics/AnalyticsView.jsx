import React from "react";
import StatCard from "../ui/StatCard";

const AnalyticsView = ({ stats, messageVolume, maxVolume }) => {
  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">
            Message Volume (Last 7 Days)
          </h3>

          <div className="space-y-3">
            {messageVolume.map((d) => (
              <div key={d.day}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{d.day}</span>
                  <span className="font-semibold">{d.count}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(d.count / maxVolume) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Times */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Response Time Performance</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-800">Average Response</span>
              <span className="text-lg font-bold text-green-700">2.5 min</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-800">First Response</span>
              <span className="text-lg font-bold text-blue-700">45 sec</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-800">Resolution Time</span>
              <span className="text-lg font-bold text-purple-700">12 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
