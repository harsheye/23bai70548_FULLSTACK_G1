import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchLogs } from "../store/logSlice";

const Logs = () => {
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

  if (status === "loading" || isInitialLoad) {
    return <div>Loading logs...</div>;
  }

  if (status === "failed") {
    return <div>Error: {error}</div>;
  }

  const filteredArray = logs.filter((log) => log.carbon >= 4);
  const lowCarbonArray = logs.filter((log) => log.carbon < 4);

  return (
    <div>
      <h2>High Carbon Activity</h2>
      {filteredArray.map((log) => (
        <div style={{ color: "red" }} key={log.id}>
          {log.activity} = {log.carbon} Kg
        </div>
      ))}
      <h2>Low Carbon Activity</h2>
      {lowCarbonArray.map((log) => (
        <div style={{ color: "green" }} key={log.id}>
          {log.activity} = {log.carbon} Kg
        </div>
      ))}
    </div>
  );
};

export default Logs;