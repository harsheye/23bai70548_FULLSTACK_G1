import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchLogs, refreshLogs } from "../store/logSlice";

const DashboardAnalytics = () => {
  const dispatch = useDispatch();
  const { data: logs, status, error } = useSelector((state) => state.logs);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (status === "idle") {
        dispatch(fetchLogs());
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsInitialLoad(false);
      }
    };
    loadData();
  }, [status, dispatch]);

  const handleRefresh = () => {
    dispatch(refreshLogs());
    dispatch(fetchLogs());
  };

  if (status === "loading" || isInitialLoad) {
    return <div>Loading analytics...</div>;
  }

  if (status === "failed") {
    return <div>Error loading analytics: {error}</div>;
  }

  const highCarbonCount = logs.filter(log => log.carbon >= 4).length;
  const lowCarbonCount = logs.filter(log => log.carbon < 4).length;
  const averageCarbon = logs.length > 0 ? (logs.reduce((acc, log) => acc + log.carbon, 0) / logs.length).toFixed(2) : 0;

  return (
    <div>
      <h2>Carbon Analytics</h2>
      <p>High Carbon Activities: {highCarbonCount}</p>
      <p>Low Carbon Activities: {lowCarbonCount}</p>
      <p>Average Carbon per Activity: {averageCarbon} kg</p>
      <button onClick={handleRefresh}>Refresh Analytics</button>
    </div>
  );
};

export default DashboardAnalytics;